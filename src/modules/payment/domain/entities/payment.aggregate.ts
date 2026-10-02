import { AggregateRoot } from '../../../../@core/domain/aggregate-root.base.ts';
import type { EntityConstructorParams } from '../../../../@core/domain/entity.base.ts';
import { Identifier } from '../../../../@core/domain/identifier.ts';
import type { PaymentMethod } from '../../../../@core/domain/types/payment.types.ts';
import { Result } from '../../../../@core/domain/result.ts';
import { ConflictError, InvalidStateError, ValidationError } from '../../../../@core/domain/errors/domain-errors.ts';

export type PaymentStatus = 'PENDENTE' | 'AGUARDANDO' | 'PAGO' | 'RECUSADO' | 'CANCELADO' | 'EXPIRADO' | 'ESTORNADO';
export type PaymentInstructions = {
  pixCopyAndPaste: string | null;
  pixQrCodeImageUrl: string | null;
  boletoLine: string | null;
  boletoUrl: string | null;
  boletoDueAt: Date | null;
};
export type PaymentStatusHistoryEntry = {
  status: PaymentStatus;
  occurredAt: Date;
  reason: string | null;
  operationId: string | null;
};
export type PaymentCancellationRecord = {
  operationId: string;
  amountInMinorUnits: number;
  occurredAt: Date;
  reason: string;
  actorId: string;
  succeeded: boolean;
  resultDescription: string | null;
};
export type PaymentRefundRecord = {
  operationId: string;
  amountInMinorUnits: number;
  occurredAt: Date;
  reason: string;
  actorId: string;
  succeeded: boolean;
  resultDescription: string | null;
};
export type PaymentProps = {
  eventId: string;
  registrationId: string;
  internalReference: string;
  amountInMinorUnits: number;
  method: PaymentMethod;
  status: PaymentStatus;
  externalTransactionId: string | null;
  providerStatusCode: string | null;
  expiresAt: Date | null;
  instructions: PaymentInstructions;
  installments: number;
  cardBrand: string | null;
  cardLastFourDigits: string | null;
  history: PaymentStatusHistoryEntry[];
  cancellations: PaymentCancellationRecord[];
  refunds: PaymentRefundRecord[];
};
export type CreatePaymentParams = {
  id?: string;
  eventId: string;
  registrationId: string;
  registrationCode: string;
  amountInMinorUnits: number;
  method: PaymentMethod;
  allowedMethods: PaymentMethod[];
  installments: number;
  maximumInstallments: number;
  cardBrand: string | null;
  cardLastFourDigits: string | null;
  now: Date;
};
export type ApplyPaymentStatusParams = {
  status: PaymentStatus;
  occurredAt: Date;
  externalTransactionId: string | null;
  providerStatusCode: string | null;
  reason: string | null;
};
export type RecordChargeDetailsParams = {
  externalTransactionId: string;
  providerStatusCode: string | null;
  expiresAt: Date | null;
  instructions: PaymentInstructions;
  occurredAt: Date;
};
export type ExpirePaymentParams = { now: Date };
export type CompareCancellationOperationParams = { existing: PaymentCancellationRecord; requested: RecordFinancialOperationParams };
export type CompareRefundOperationParams = { existing: PaymentRefundRecord; requested: RecordFinancialOperationParams };
export type RecordFinancialOperationParams = {
  operationId: string;
  amountInMinorUnits: number;
  reason: string;
  actorId: string;
  occurredAt: Date;
  succeeded: boolean;
  resultDescription: string | null;
};
export type PaymentSnapshot = PaymentProps & { id: string; createdAt: Date; updatedAt: Date };

export class Payment extends AggregateRoot<PaymentProps> {
  private constructor(params: EntityConstructorParams<PaymentProps>) {
    super(params);
  }

  public static create(params: CreatePaymentParams): Result<Payment, ValidationError> {
    const invalid = this.validate(params);
    if (invalid) return Result.fail(invalid);
    const now = new Date(params.now.getTime());
    const paymentId = params.id ?? Identifier.create().toString();
    const entityParams: EntityConstructorParams<PaymentProps> = {
      props: {
        eventId: params.eventId,
        registrationId: params.registrationId,
        internalReference: `EVENT-${params.eventId}-INSCRICAO-${params.registrationCode}-PAGAMENTO-${paymentId}`,
        amountInMinorUnits: params.amountInMinorUnits,
        method: params.method,
        status: 'PENDENTE',
        externalTransactionId: null,
        providerStatusCode: null,
        expiresAt: null,
        instructions: { pixCopyAndPaste: null, pixQrCodeImageUrl: null, boletoLine: null, boletoUrl: null, boletoDueAt: null },
        installments: params.installments,
        cardBrand: params.method === 'CARTAO_CREDITO' ? this.clean(params.cardBrand) : null,
        cardLastFourDigits: params.method === 'CARTAO_CREDITO' ? params.cardLastFourDigits : null,
        history: [{ status: 'PENDENTE', occurredAt: now, reason: null, operationId: null }],
        cancellations: [],
        refunds: [],
      },
      createdAt: now,
      updatedAt: now,
    };
    entityParams.id = Identifier.fromExisting(paymentId);
    return Result.ok(new Payment(entityParams));
  }

  public get eventId(): string { return this.props.eventId; }
  public get registrationId(): string { return this.props.registrationId; }
  public get internalReference(): string { return this.props.internalReference; }
  public get amountInMinorUnits(): number { return this.props.amountInMinorUnits; }
  public get method(): PaymentMethod { return this.props.method; }
  public get status(): PaymentStatus { return this.props.status; }
  public get externalTransactionId(): string | null { return this.props.externalTransactionId; }
  public get providerStatusCode(): string | null { return this.props.providerStatusCode; }
  public get expiresAt(): Date | null { return this.props.expiresAt ? new Date(this.props.expiresAt.getTime()) : null; }
  public get instructions(): PaymentInstructions { return this.copyInstructions(this.props.instructions); }
  public get installments(): number { return this.props.installments; }
  public get cardBrand(): string | null { return this.props.cardBrand; }
  public get cardLastFourDigits(): string | null { return this.props.cardLastFourDigits; }
  public get history(): PaymentStatusHistoryEntry[] { return this.copyHistory(this.props.history); }
  public get cancellations(): PaymentCancellationRecord[] { return this.copyCancellations(this.props.cancellations); }
  public get refunds(): PaymentRefundRecord[] { return this.copyRefunds(this.props.refunds); }

  public get refundedAmountInMinorUnits(): number {
    return this.props.refunds.reduce((total, refund) => total + (refund.succeeded ? refund.amountInMinorUnits : 0), 0);
  }

  public get hasOpenCharge(): boolean {
    return this.props.status === 'PENDENTE' || this.props.status === 'AGUARDANDO';
  }

  public applyStatus(params: ApplyPaymentStatusParams): Result<boolean, ValidationError | InvalidStateError | ConflictError> {
    const transitionError = this.validateStatusTransition(params.status);
    if (transitionError) return Result.fail(transitionError);
    if (this.hasConflictingTransactionId(params.externalTransactionId)) {
      return Result.fail(new ConflictError({ code: 'PAYMENT_TRANSACTION_ID_CONFLICT', message: 'O identificador externo do pagamento não pode ser substituído.' }));
    }
    if (params.status === 'ESTORNADO' && this.refundedAmountInMinorUnits < this.props.amountInMinorUnits) {
      return Result.fail(new InvalidStateError({ code: 'PAYMENT_NOT_FULLY_REFUNDED', message: 'O pagamento só pode ser marcado como estornado após o estorno integral.' }));
    }
    this.linkProviderData(params);
    if (params.status === this.props.status || (this.props.status === 'PAGO' && params.status !== 'ESTORNADO')) {
      return Result.ok(false);
    }
    this.props.status = params.status;
    this.recordStatus({ status: params.status, occurredAt: params.occurredAt, reason: params.reason, operationId: null });
    this.touch({ at: params.occurredAt });
    return Result.ok(true);
  }

  public recordChargeDetails(params: RecordChargeDetailsParams): Result<void, ValidationError | InvalidStateError | ConflictError> {
    const externalId = params.externalTransactionId.trim();
    if (!externalId) {
      return Result.fail(new ValidationError({ code: 'EXTERNAL_TRANSACTION_ID_REQUIRED', message: 'A cobrança deve possuir identificador externo.' }));
    }
    if (!this.hasOpenCharge) {
      return Result.fail(new InvalidStateError({ code: 'PAYMENT_CHARGE_NOT_OPEN', message: 'A cobrança não está em situação pendente.' }));
    }
    if (this.hasConflictingTransactionId(externalId)) {
      return Result.fail(new ConflictError({ code: 'PAYMENT_TRANSACTION_ID_CONFLICT', message: 'O identificador externo do pagamento não pode ser substituído.' }));
    }
    this.props.externalTransactionId = externalId;
    this.props.providerStatusCode = params.providerStatusCode?.trim() || null;
    this.props.expiresAt = params.expiresAt ? new Date(params.expiresAt.getTime()) : null;
    this.props.instructions = this.copyInstructions(params.instructions);
    this.touch({ at: params.occurredAt });
    return Result.ok();
  }

  public expireIfDue(params: ExpirePaymentParams): boolean {
    const expiresAt = this.props.expiresAt;
    if (!this.hasOpenCharge || !expiresAt || expiresAt.getTime() > params.now.getTime()) return false;
    this.props.status = 'EXPIRADO';
    this.recordStatus({ status: 'EXPIRADO', occurredAt: params.now, reason: 'Prazo da cobrança encerrado.', operationId: null });
    this.touch({ at: params.now });
    return true;
  }

  public recordCancellation(params: RecordFinancialOperationParams): Result<void, ValidationError | InvalidStateError | ConflictError> {
    const existing = this.props.cancellations.find((item) => item.operationId === params.operationId);
    if (existing) return this.matchesCancellation({ existing, requested: params })
      ? Result.ok()
      : Result.fail(new ConflictError({ code: 'FINANCIAL_OPERATION_ID_CONFLICT', message: 'O identificador da operação financeira já foi utilizado com outros dados.' }));
    if (this.props.refunds.some((item) => item.operationId === params.operationId)) {
      return Result.fail(new ConflictError({ code: 'FINANCIAL_OPERATION_ID_CONFLICT', message: 'O identificador da operação financeira já foi utilizado.' }));
    }
    const error = this.validateFinancialOperation(params);
    if (error) return Result.fail(error);
    if (this.props.status !== 'PENDENTE' && this.props.status !== 'AGUARDANDO') {
      return Result.fail(new InvalidStateError({ code: 'PAYMENT_CANNOT_BE_CANCELLED', message: 'O pagamento não pode ser cancelado no estado atual.' }));
    }
    this.props.cancellations.push(this.toCancellationRecord(params));
    if (params.succeeded) {
      this.props.status = 'CANCELADO';
      this.recordStatus({ status: 'CANCELADO', occurredAt: params.occurredAt, reason: params.reason, operationId: params.operationId });
    }
    this.touch({ at: params.occurredAt });
    return Result.ok();
  }

  public recordRefund(params: RecordFinancialOperationParams): Result<void, ValidationError | InvalidStateError | ConflictError> {
    const existing = this.props.refunds.find((item) => item.operationId === params.operationId);
    if (existing) return this.matchesRefund({ existing, requested: params })
      ? Result.ok()
      : Result.fail(new ConflictError({ code: 'FINANCIAL_OPERATION_ID_CONFLICT', message: 'O identificador da operação financeira já foi utilizado com outros dados.' }));
    if (this.props.cancellations.some((item) => item.operationId === params.operationId)) {
      return Result.fail(new ConflictError({ code: 'FINANCIAL_OPERATION_ID_CONFLICT', message: 'O identificador da operação financeira já foi utilizado.' }));
    }
    const error = this.validateFinancialOperation(params);
    if (error) return Result.fail(error);
    if (this.props.status !== 'PAGO') {
      return Result.fail(new InvalidStateError({ code: 'PAYMENT_CANNOT_BE_REFUNDED', message: 'Somente pagamentos aprovados podem ser estornados.' }));
    }
    if (params.amountInMinorUnits > this.props.amountInMinorUnits - this.refundedAmountInMinorUnits) {
      return Result.fail(new ValidationError({ code: 'REFUND_AMOUNT_EXCEEDS_BALANCE', message: 'O valor do estorno supera o saldo ainda não estornado.' }));
    }
    this.props.refunds.push(this.toRefundRecord(params));
    if (params.succeeded && this.refundedAmountInMinorUnits === this.props.amountInMinorUnits) {
      this.props.status = 'ESTORNADO';
      this.recordStatus({ status: 'ESTORNADO', occurredAt: params.occurredAt, reason: params.reason, operationId: params.operationId });
    }
    this.touch({ at: params.occurredAt });
    return Result.ok();
  }

  public snapshot(): PaymentSnapshot {
    return {
      ...this.props,
      expiresAt: this.expiresAt,
      instructions: this.instructions,
      history: this.history,
      cancellations: this.cancellations,
      refunds: this.refunds,
      id: this.id.toString(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private validateStatusTransition(next: PaymentStatus): InvalidStateError | null {
    if (next === this.props.status) return null;
    if (next === 'ESTORNADO' && this.props.status !== 'PAGO' && this.props.status !== 'ESTORNADO') {
      return new InvalidStateError({ code: 'PAYMENT_NOT_PAID', message: 'Somente pagamentos aprovados podem ser estornados.' });
    }
    if (this.props.status === 'ESTORNADO') {
      return new InvalidStateError({ code: 'PAYMENT_ALREADY_REFUNDED', message: 'Um pagamento estornado não pode voltar a outro estado.' });
    }
    if (this.props.status === 'PAGO' || next === 'PAGO') return null;
    if (this.props.status !== 'PENDENTE' && this.props.status !== 'AGUARDANDO') {
      return new InvalidStateError({ code: 'PAYMENT_STATUS_TERMINAL', message: 'O status terminal do pagamento não pode ser substituído.' });
    }
    if (next === 'PENDENTE') {
      return new InvalidStateError({ code: 'PAYMENT_STATUS_REGRESSION', message: 'O status do pagamento não pode voltar para pendente.' });
    }
    return null;
  }

  private hasConflictingTransactionId(externalTransactionId: string | null): boolean {
    return Boolean(this.props.externalTransactionId && externalTransactionId
      && this.props.externalTransactionId !== externalTransactionId.trim());
  }

  private linkProviderData(params: ApplyPaymentStatusParams): void {
    if (params.externalTransactionId?.trim()) this.props.externalTransactionId = params.externalTransactionId.trim();
    if (params.providerStatusCode?.trim()) this.props.providerStatusCode = params.providerStatusCode.trim();
  }

  private validateFinancialOperation(params: RecordFinancialOperationParams): ValidationError | ConflictError | null {
    if (!params.operationId.trim() || !params.reason.trim() || !params.actorId.trim()
      || !Number.isSafeInteger(params.amountInMinorUnits) || params.amountInMinorUnits <= 0) {
      return new ValidationError({ code: 'FINANCIAL_OPERATION_AUDIT_REQUIRED', message: 'A operação financeira deve possuir identificador, valor, motivo e responsável válidos.' });
    }
    if (params.amountInMinorUnits > this.props.amountInMinorUnits) {
      return new ValidationError({ code: 'FINANCIAL_OPERATION_AMOUNT_EXCEEDS_PAYMENT', message: 'O valor da operação supera o valor da cobrança.' });
    }
    return null;
  }

  private matchesCancellation(params: CompareCancellationOperationParams): boolean {
    const existing = params.existing;
    const requested = params.requested;
    return existing.amountInMinorUnits === requested.amountInMinorUnits
      && existing.reason === requested.reason.trim()
      && existing.actorId === requested.actorId
      && existing.succeeded === requested.succeeded
      && existing.resultDescription === requested.resultDescription;
  }

  private matchesRefund(params: CompareRefundOperationParams): boolean {
    const existing = params.existing;
    const requested = params.requested;
    return existing.amountInMinorUnits === requested.amountInMinorUnits
      && existing.reason === requested.reason.trim()
      && existing.actorId === requested.actorId
      && existing.succeeded === requested.succeeded
      && existing.resultDescription === requested.resultDescription;
  }

  private toCancellationRecord(params: RecordFinancialOperationParams): PaymentCancellationRecord {
    return {
      operationId: params.operationId,
      amountInMinorUnits: params.amountInMinorUnits,
      occurredAt: new Date(params.occurredAt.getTime()),
      reason: params.reason.trim(),
      actorId: params.actorId,
      succeeded: params.succeeded,
      resultDescription: params.resultDescription,
    };
  }

  private toRefundRecord(params: RecordFinancialOperationParams): PaymentRefundRecord {
    return {
      operationId: params.operationId,
      amountInMinorUnits: params.amountInMinorUnits,
      occurredAt: new Date(params.occurredAt.getTime()),
      reason: params.reason.trim(),
      actorId: params.actorId,
      succeeded: params.succeeded,
      resultDescription: params.resultDescription,
    };
  }

  private recordStatus(params: PaymentStatusHistoryEntry): void {
    this.props.history.push({ ...params, occurredAt: new Date(params.occurredAt.getTime()) });
  }

  private static validate(params: CreatePaymentParams): ValidationError | null {
    if (!params.eventId.trim() || !params.registrationId.trim() || !params.registrationCode.trim()) {
      return new ValidationError({ code: 'PAYMENT_RELATION_REQUIRED', message: 'Pagamento deve estar vinculado a evento e inscrição.' });
    }
    if (!Number.isSafeInteger(params.amountInMinorUnits) || params.amountInMinorUnits <= 0) {
      return new ValidationError({ code: 'PAYMENT_AMOUNT_INVALID', message: 'O pagamento deve possuir valor positivo em centavos.' });
    }
    if (!params.allowedMethods.includes(params.method)) {
      return new ValidationError({ code: 'PAYMENT_METHOD_NOT_ALLOWED', message: 'A forma de pagamento não está habilitada para este evento.' });
    }
    if (!Number.isSafeInteger(params.maximumInstallments) || params.maximumInstallments < 1
      || !Number.isSafeInteger(params.installments) || params.installments < 1
      || params.installments > params.maximumInstallments) {
      return new ValidationError({ code: 'PAYMENT_INSTALLMENTS_INVALID', message: 'A quantidade de parcelas excede a configuração do evento.' });
    }
    if (params.method !== 'CARTAO_CREDITO' && params.installments !== 1) {
      return new ValidationError({ code: 'PAYMENT_INSTALLMENTS_NOT_SUPPORTED', message: 'Parcelamento é permitido somente para cartão de crédito.' });
    }
    if (params.cardLastFourDigits !== null && !/^\d{4}$/.test(params.cardLastFourDigits)) {
      return new ValidationError({ code: 'CARD_LAST_DIGITS_INVALID', message: 'Armazene somente os quatro últimos dígitos do cartão.' });
    }
    return null;
  }

  private static clean(value: string | null): string | null {
    return value?.trim() || null;
  }

  private copyInstructions(instructions: PaymentInstructions): PaymentInstructions {
    return {
      ...instructions,
      boletoDueAt: instructions.boletoDueAt ? new Date(instructions.boletoDueAt.getTime()) : null,
    };
  }

  private copyHistory(history: PaymentStatusHistoryEntry[]): PaymentStatusHistoryEntry[] {
    return history.map((entry) => ({ ...entry, occurredAt: new Date(entry.occurredAt.getTime()) }));
  }

  private copyCancellations(records: PaymentCancellationRecord[]): PaymentCancellationRecord[] {
    return records.map((record) => ({ ...record, occurredAt: new Date(record.occurredAt.getTime()) }));
  }

  private copyRefunds(records: PaymentRefundRecord[]): PaymentRefundRecord[] {
    return records.map((record) => ({ ...record, occurredAt: new Date(record.occurredAt.getTime()) }));
  }
}
