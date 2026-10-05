import type { PaymentNotification } from '../entities/payment-notification.entity';

export type RegisterNotificationResult =
  | { status: 'REGISTERED'; notification: PaymentNotification }
  | { status: 'DUPLICATED'; notification: PaymentNotification };

export interface IPaymentNotificationRepository {
  /** Registra a notificação de forma idempotente por (provider, notificationId) (§20). */
  register(params: {
    providerName: string;
    notificationId: string;
    paymentId: string | null;
    providerStatus: string;
    reference: string | null;
    payload: Record<string, unknown>;
    receivedAt: Date;
  }): Promise<RegisterNotificationResult>;
  findByNotificationId(params: { providerName: string; notificationId: string }): Promise<PaymentNotification | null>;
  listByPayment(paymentId: string): Promise<PaymentNotification[]>;
  update(notification: PaymentNotification): Promise<void>;
}

export const PAYMENT_NOTIFICATION_REPOSITORY = Symbol('IPaymentNotificationRepository');
