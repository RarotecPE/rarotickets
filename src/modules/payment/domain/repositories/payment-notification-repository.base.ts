import type { PaymentNotification } from '../entities/payment-notification.entity';
import type {
  IPaymentNotificationRepository,
  RegisterNotificationResult,
} from './payment-notification-repository.interface';

export abstract class PaymentNotificationRepository implements IPaymentNotificationRepository {
  abstract register(params: {
    providerName: string;
    notificationId: string;
    paymentId: string | null;
    providerStatus: string;
    reference: string | null;
    payload: Record<string, unknown>;
    receivedAt: Date;
  }): Promise<RegisterNotificationResult>;
  abstract findByNotificationId(params: {
    providerName: string;
    notificationId: string;
  }): Promise<PaymentNotification | null>;
  abstract listByPayment(paymentId: string): Promise<PaymentNotification[]>;
  abstract update(notification: PaymentNotification): Promise<void>;
}
