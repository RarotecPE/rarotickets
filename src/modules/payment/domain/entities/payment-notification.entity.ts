import { Entity } from '../../../../@core/domain/entity.base.ts';
import type { EntityConstructorParams } from '../../../../@core/domain/entity.base.ts';
import { Identifier } from '../../../../@core/domain/identifier.ts';
import { Result } from '../../../../@core/domain/result.ts';
import { ConflictError, InvalidStateError, ValidationError } from '../../../../@core/domain/errors/domain-errors.ts';
import type { PaymentStatus } from './payment.aggregate.ts';

export type PaymentNotificationProvider = 'PAGBANK';
export type NotificationProcessingStatus = 'RECEBIDA' | 'PROCESSANDO' | 'PROCESSADA' | 'FALHA';
export type PaymentNotificationProps = {
  provider: PaymentNotificationProvider;
  externalNotificationId: string;
  internalReference: string | null;
  externalTransactionId: string | null;
  status: PaymentStatus;
  financialOperationId: string | null;
  financialAmountInMinorUnits: number | null;
  financialReason: string | null;
  payloadDigest: string;
  receivedAt: Date;
  deliveryCount: number;
  processingStatus: NotificationProcessingStatus;
  processingStartedAt: Date | null;
  processedAt: Date | null;
  failureReason: string | null;
};
export type CreatePaymentNotificationParams = Omit<PaymentNotificationProps,
  'deliveryCount' | 'processingStatus' | 'processingStartedAt' | 'processedAt' | 'failureReason'>;
export type ClaimNotificationParams = { now: Date; leaseMilliseconds: number };
export type RecordNotificationDeliveryParams = { receivedAt: Date; payloadDigest: string };
export type MarkNotificationFailedParams = { now: Date; reason: string };
export type PaymentNotificationSnapshot = PaymentNotificationProps & { id: string; createdAt: Date; updatedAt: Date };

export class PaymentNotification extends Entity<PaymentNotificationProps> {
  private constructor(params: EntityConstructorParams<PaymentNotificationProps>) {
    super(params);
  }

  public static create(params: CreatePaymentNotificationParams): Result<PaymentNotification, ValidationError> {
    if (!params.externalNotificationId.trim() || !params.payloadDigest.trim()
      || (!params.internalReference?.trim() && !params.externalTransactionId?.trim())) {
      return Result.fail(new ValidationError({ code: 'PAYMENT_NOTIFICATION_INVALID', message: 'A notificação deve possuir identificador externo e uma referência de pagamento.' }));
    }
    if (params.status === 'ESTORNADO' && (!params.financialOperationId?.trim()
      || !params.financialReason?.trim() || !Number.isSafeInteger(params.financialAmountInMinorUnits)
      || (params.financialAmountInMinorUnits ?? 0) <= 0)) {
      return Result.fail(new ValidationError({ code: 'REFUND_NOTIFICATION_DETAILS_REQUIRED', message: 'A notificação de estorno deve informar operação, valor e motivo.' }));
    }
    const id = `${params.provider}:${params.externalNotificationId.trim()}`;
    const props: PaymentNotificationProps = {
      ...params,
      externalNotificationId: params.externalNotificationId.trim(),
      internalReference: params.internalReference?.trim() || null,
      externalTransactionId: params.externalTransactionId?.trim() || null,
      financialOperationId: params.financialOperationId?.trim() || null,
      financialAmountInMinorUnits: params.financialAmountInMinorUnits,
      financialReason: params.financialReason?.trim() || null,
      payloadDigest: params.payloadDigest.trim(),
      receivedAt: new Date(params.receivedAt.getTime()),
      deliveryCount: 1,
      processingStatus: 'RECEBIDA',
      processingStartedAt: null,
      processedAt: null,
      failureReason: null,
    };
    return Result.ok(new PaymentNotification({ props, id: Identifier.fromExisting(id), createdAt: params.receivedAt, updatedAt: params.receivedAt }));
  }

  public get provider(): PaymentNotificationProvider { return this.props.provider; }
  public get externalNotificationId(): string { return this.props.externalNotificationId; }
  public get internalReference(): string | null { return this.props.internalReference; }
  public get externalTransactionId(): string | null { return this.props.externalTransactionId; }
  public get status(): PaymentStatus { return this.props.status; }
  public get financialOperationId(): string | null { return this.props.financialOperationId; }
  public get financialAmountInMinorUnits(): number | null { return this.props.financialAmountInMinorUnits; }
  public get financialReason(): string | null { return this.props.financialReason; }
  public get payloadDigest(): string { return this.props.payloadDigest; }
  public get deliveryCount(): number { return this.props.deliveryCount; }
  public get processingStatus(): NotificationProcessingStatus { return this.props.processingStatus; }
  public get processedAt(): Date | null { return this.props.processedAt ? new Date(this.props.processedAt.getTime()) : null; }

  public recordDelivery(params: RecordNotificationDeliveryParams): Result<void, ConflictError> {
    if (this.props.payloadDigest !== params.payloadDigest) {
      return Result.fail(new ConflictError({ code: 'PAYMENT_NOTIFICATION_ID_REUSED', message: 'O identificador da notificação foi reutilizado com conteúdo diferente.' }));
    }
    this.props.deliveryCount += 1;
    this.touch({ at: params.receivedAt });
    return Result.ok();
  }

  public claim(params: ClaimNotificationParams): Result<boolean, ValidationError | InvalidStateError> {
    if (!Number.isSafeInteger(params.leaseMilliseconds) || params.leaseMilliseconds <= 0) {
      return Result.fail(new ValidationError({ code: 'NOTIFICATION_LEASE_INVALID', message: 'O prazo de processamento da notificação deve ser positivo.' }));
    }
    if (this.props.processingStatus === 'PROCESSADA') return Result.ok(false);
    if (this.props.processingStatus === 'PROCESSANDO' && this.props.processingStartedAt
      && this.props.processingStartedAt.getTime() + params.leaseMilliseconds > params.now.getTime()) {
      return Result.ok(false);
    }
    this.props.processingStatus = 'PROCESSANDO';
    this.props.processingStartedAt = new Date(params.now.getTime());
    this.props.failureReason = null;
    this.touch({ at: params.now });
    return Result.ok(true);
  }

  public markProcessed(now: Date): Result<void, InvalidStateError> {
    if (this.props.processingStatus === 'PROCESSADA') return Result.ok();
    if (this.props.processingStatus !== 'PROCESSANDO') {
      return Result.fail(new InvalidStateError({ code: 'NOTIFICATION_NOT_CLAIMED', message: 'A notificação deve ser reivindicada antes de ser concluída.' }));
    }
    this.props.processingStatus = 'PROCESSADA';
    this.props.processedAt = new Date(now.getTime());
    this.props.processingStartedAt = null;
    this.touch({ at: now });
    return Result.ok();
  }

  public markFailed(params: MarkNotificationFailedParams): Result<void, InvalidStateError | ValidationError> {
    if (!params.reason.trim()) {
      return Result.fail(new ValidationError({ code: 'NOTIFICATION_FAILURE_REASON_REQUIRED', message: 'Registre o motivo da falha de processamento.' }));
    }
    if (this.props.processingStatus !== 'PROCESSANDO') {
      return Result.fail(new InvalidStateError({ code: 'NOTIFICATION_NOT_CLAIMED', message: 'A notificação deve estar em processamento para registrar uma falha.' }));
    }
    this.props.processingStatus = 'FALHA';
    this.props.failureReason = params.reason.trim();
    this.props.processingStartedAt = null;
    this.touch({ at: params.now });
    return Result.ok();
  }

  public snapshot(): PaymentNotificationSnapshot {
    return {
      ...this.props,
      receivedAt: new Date(this.props.receivedAt.getTime()),
      processingStartedAt: this.props.processingStartedAt ? new Date(this.props.processingStartedAt.getTime()) : null,
      processedAt: this.processedAt,
      id: this.id.toString(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
