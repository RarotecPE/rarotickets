import { Entity } from '@core/domain/entity.base';
import type { EntityConstructorParams } from '@core/domain/entity.base';
import { Result } from '@core/domain/result';

export type PaymentNotificationProps = {
  providerName: string;
  notificationId: string;
  paymentId: string | null;
  providerStatus: string;
  reference: string | null;
  payload: Record<string, unknown>;
  receivedAt: Date;
  processedAt: Date | null;
  errorMessage: string | null;
};

export type PaymentNotificationConstructorParams = EntityConstructorParams<PaymentNotificationProps>;
export type ReconstitutePaymentNotificationParams = PaymentNotificationConstructorParams & {
  id: NonNullable<PaymentNotificationConstructorParams['id']>;
};

export type CreatePaymentNotificationParams = {
  providerName: string;
  notificationId: string;
  paymentId?: string | null;
  providerStatus: string;
  reference?: string | null;
  payload: Record<string, unknown>;
  receivedAt: Date;
};

/**
 * Notificação recebida do provedor (§17, §20). A chave
 * (providerName + notificationId) garante idempotência: reenvios não reprocessam
 * e o histórico permanece auditável.
 */
export class PaymentNotification extends Entity<PaymentNotificationProps> {
  private constructor(params: PaymentNotificationConstructorParams) {
    super(params);
  }

  public static create(params: CreatePaymentNotificationParams): Result<PaymentNotification> {
    if (!params.notificationId || params.notificationId.trim().length < 3) {
      return Result.fail(new Error('Identificador da notificação é obrigatório'));
    }
    return Result.ok(
      new PaymentNotification({
        props: {
          providerName: params.providerName,
          notificationId: params.notificationId.trim(),
          paymentId: params.paymentId ?? null,
          providerStatus: params.providerStatus,
          reference: params.reference ?? null,
          payload: params.payload,
          receivedAt: params.receivedAt,
          processedAt: null,
          errorMessage: null,
        },
      }),
    );
  }

  public static reconstitute(params: ReconstitutePaymentNotificationParams): PaymentNotification {
    return new PaymentNotification(params);
  }

  public get providerName(): string { return this.props.providerName; }
  public get notificationId(): string { return this.props.notificationId; }
  public get paymentId(): string | null { return this.props.paymentId; }
  public get providerStatus(): string { return this.props.providerStatus; }
  public get reference(): string | null { return this.props.reference; }
  public get payload(): Record<string, unknown> { return this.props.payload; }
  public get receivedAt(): Date { return this.props.receivedAt; }
  public get processedAt(): Date | null { return this.props.processedAt; }
  public get errorMessage(): string | null { return this.props.errorMessage; }

  public isProcessed(): boolean {
    return this.props.processedAt !== null && this.props.errorMessage === null;
  }

  public isFailed(): boolean {
    return this.props.errorMessage !== null;
  }

  public linkToPayment(paymentId: string): void {
    this.props.paymentId = paymentId;
    this.touch();
  }

  public markProcessed(params: { at: Date }): void {
    this.props.processedAt = params.at;
    this.props.errorMessage = null;
    this.touch();
  }

  public markFailed(params: { at: Date; errorMessage: string }): void {
    this.props.processedAt = params.at;
    this.props.errorMessage = params.errorMessage;
    this.touch();
  }
}
