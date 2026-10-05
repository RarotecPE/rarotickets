import { AggregateRoot } from '@core/domain/aggregate-root.base';
import type { EntityConstructorParams } from '@core/domain/entity.base';
import { Result } from '@core/domain/result';
import { MoneyVO } from '@core/domain/value-objects/money.vo';
import { InstallmentPlan } from '../value-objects/installment-plan.vo';
import { PaymentMethod } from '../value-objects/payment-method.vo';
import { PaymentReference } from '../value-objects/payment-reference.vo';
import { PaymentStatus } from '../value-objects/payment-status.vo';
import { PaymentTransaction } from '../value-objects/payment-transaction.vo';
import { InvalidPaymentTransitionError } from '../errors/invalid-payment-transition.error';
import { PaymentRefundNotAllowedError } from '../errors/payment-refund-not-allowed.error';

export type PaymentProps = {
  registrationId: string;
  eventId: string;
  participantId: string;
  reference: PaymentReference;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: MoneyVO;
  installments: InstallmentPlan;
  transaction: PaymentTransaction;
  expiresAt: Date | null;
  paidAt: Date | null;
  refundedAt: Date | null;
  refundedAmountCents: number | null;
  refundReason: string | null;
  cancelReason: string | null;
  failureReason: string | null;
  providerName: string | null;
  createdBy: string | null;
};

export type PaymentConstructorParams = EntityConstructorParams<PaymentProps>;
export type ReconstitutePaymentParams = PaymentConstructorParams & { id: NonNullable<PaymentConstructorParams['id']> };

export type CreatePaymentParams = {
  registrationId: string;
  eventId: string;
  participantId: string;
  reference: PaymentReference;
  method: PaymentMethod;
  amountCents: number;
  installments: InstallmentPlan;
  expiresAt: Date | null;
  providerName: string;
  createdBy?: string | null;
};

/**
 * Agregado responsável pela cobrança de uma inscrição (§13 a §24).
 * Nunca guarda PAN nem CVV: apenas o retorno tokenizado do provedor.
 */
export class Payment extends AggregateRoot<PaymentProps> {
  private constructor(params: PaymentConstructorParams) {
    super(params);
  }

  public static create(params: CreatePaymentParams): Result<Payment> {
    const amount = MoneyVO.create({ cents: params.amountCents });
    if (amount.isFailure) return Result.fail(amount.error);
    if (amount.value.cents <= 0) return Result.fail(new Error('Valor do pagamento deve ser positivo'));

    return Result.ok(
      new Payment({
        props: {
          registrationId: params.registrationId,
          eventId: params.eventId,
          participantId: params.participantId,
          reference: params.reference,
          method: params.method,
          status: PaymentStatus.reconstitute('PENDENTE'),
          amount: amount.value,
          installments: params.installments,
          transaction: PaymentTransaction.empty(),
          expiresAt: params.expiresAt,
          paidAt: null,
          refundedAt: null,
          refundedAmountCents: 0,
          refundReason: null,
          cancelReason: null,
          failureReason: null,
          providerName: params.providerName,
          createdBy: params.createdBy ?? null,
        },
      }),
    );
  }

  public static reconstitute(params: ReconstitutePaymentParams): Payment {
    return new Payment(params);
  }

  public get registrationId(): string { return this.props.registrationId; }
  public get eventId(): string { return this.props.eventId; }
  public get participantId(): string { return this.props.participantId; }
  public get reference(): PaymentReference { return this.props.reference; }
  public get method(): PaymentMethod { return this.props.method; }
  public get status(): PaymentStatus { return this.props.status; }
  public get amount(): MoneyVO { return this.props.amount; }
  public get installments(): InstallmentPlan { return this.props.installments; }
  public get transaction(): PaymentTransaction { return this.props.transaction; }
  public get expiresAt(): Date | null { return this.props.expiresAt; }
  public get paidAt(): Date | null { return this.props.paidAt; }
  public get refundedAt(): Date | null { return this.props.refundedAt; }
  public get refundedAmountCents(): number { return this.props.refundedAmountCents ?? 0; }
  public get refundReason(): string | null { return this.props.refundReason; }
  public get cancelReason(): string | null { return this.props.cancelReason; }
  public get failureReason(): string | null { return this.props.failureReason; }
  public get providerName(): string | null { return this.props.providerName; }
  public get createdBy(): string | null { return this.props.createdBy; }

  public isOpen(): boolean {
    return this.props.status.isOpen();
  }

  public isPaid(): boolean {
    return this.props.status.isPaid();
  }

  public isExpiredAt(at: Date): boolean {
    return Boolean(this.props.expiresAt && this.isOpen() && this.props.expiresAt.getTime() <= at.getTime());
  }

  public wasChargedThrough(providerChargeId: string): boolean {
    return this.props.transaction.providerChargeId === providerChargeId;
  }

  /** Cobrança registrada no provedor e aguardando pagamento (§14). */
  public markAwaiting(params: {
    providerChargeId: string;
    providerStatus: string;
    transaction: PaymentTransaction;
    expiresAt: Date | null;
  }): Result<void> {
    const transition = this.applyStatus('AGUARDANDO');
    if (transition.isFailure) return transition;

    this.props.transaction = params.transaction.withPaymentData({
      providerName: params.transaction.providerName ?? this.props.providerName,
      providerChargeId: params.providerChargeId,
      providerStatus: params.providerStatus,
    });
    if (params.expiresAt) this.props.expiresAt = params.expiresAt;
    this.props.failureReason = null;
    this.touch();
    return Result.ok();
  }

  /** Pagamento confirmado pelo provedor: PIX/boleto pago ou cartão autorizado (§14, §18). */
  public markPaid(params: { at: Date; providerStatus?: string | null }): Result<void> {
    const transition = this.applyStatus('PAGO');
    if (transition.isFailure) return transition;

    this.props.paidAt = params.at;
    this.props.failureReason = null;
    if (params.providerStatus) {
      this.props.transaction = this.props.transaction.withPaymentData({ providerStatus: params.providerStatus });
    }
    this.touch();
    return Result.ok();
  }

  public markRefused(params: { at: Date; reason: string; providerStatus?: string | null }): Result<void> {
    const transition = this.applyStatus('RECUSADO');
    if (transition.isFailure) return transition;

    this.props.failureReason = params.reason;
    if (params.providerStatus) {
      this.props.transaction = this.props.transaction.withPaymentData({ providerStatus: params.providerStatus });
    }
    this.touch();
    return Result.ok();
  }

  public expire(params: { at: Date; reason: string }): Result<void> {
    const transition = this.applyStatus('EXPIRADO');
    if (transition.isFailure) return transition;

    this.props.failureReason = params.reason;
    this.touch();
    return Result.ok();
  }

  public cancel(params: { at: Date; reason: string }): Result<void> {
    if (this.props.status.isPaid()) {
      return Result.fail(new PaymentRefundNotAllowedError('Pagamento já confirmado: use o estorno para devolver o valor'));
    }
    if (this.props.status.isCancelled()) return Result.ok();

    const transition = this.applyStatus('CANCELADO');
    if (transition.isFailure) return transition;

    this.props.cancelReason = params.reason;
    this.props.failureReason = params.reason;
    this.touch();
    return Result.ok();
  }

  /** Saldo ainda estornável (§22). */
  public get refundableAmountCents(): number {
    return this.props.status.isPaid() ? this.props.amount.cents - this.refundedAmountCents : 0;
  }

  public isRefundable(): boolean {
    return this.props.status.isPaid() && this.refundableAmountCents > 0;
  }

  /** Estorno total (amountCents ausente) ou parcial — registra quando, quanto e por quê (§22). */
  public refund(params: { at: Date; reason: string; amountCents?: number | null }): Result<void> {
    if (!this.props.status.isPaid()) {
      return Result.fail(new PaymentRefundNotAllowedError('Somente pagamentos confirmados podem ser estornados'));
    }
    if (!params.reason || params.reason.trim().length < 5) {
      return Result.fail(new PaymentRefundNotAllowedError('Estorno exige justificativa com ao menos 5 caracteres'));
    }

    const refundable = this.refundableAmountCents;
    const amountCents = params.amountCents ?? refundable;
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      return Result.fail(new PaymentRefundNotAllowedError('Valor do estorno deve ser positivo'));
    }
    if (amountCents > refundable) {
      return Result.fail(
        new PaymentRefundNotAllowedError('Valor do estorno excede o saldo disponível para devolução'),
      );
    }

    this.props.refundedAmountCents = this.refundedAmountCents + amountCents;
    this.props.refundedAt = params.at;
    this.props.refundReason = params.reason.trim();
    if (this.refundedAmountCents >= this.props.amount.cents) {
      const transition = this.applyStatus('ESTORNADO');
      if (transition.isFailure) return transition;
    }
    this.touch();
    return Result.ok();
  }

  /** Valores recebidos após cancelamento/expiracao exigem análise da equipe (§24). */
  public flagForFinancialReview(params: { at: Date; reason: string }): void {
    this.props.failureReason = `Revisão financeira: ${params.reason}`;
    this.touch();
  }

  public toJSON(): PaymentProps {
    return { ...this.props };
  }

  private applyStatus(next: PaymentStatus['value']): Result<void> {
    const nextStatus = PaymentStatus.create(next);
    if (nextStatus.isFailure) return Result.fail(nextStatus.error);
    if (!this.props.status.canTransitionTo(nextStatus.value)) {
      if (this.props.status.value !== nextStatus.value.value) {
        return Result.fail(new InvalidPaymentTransitionError(this.props.status.value, nextStatus.value.value));
      }
      return Result.ok();
    }
    this.props.status = nextStatus.value;
    return Result.ok();
  }
}
