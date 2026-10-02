import type { Result } from '../../../../@core/domain/result.ts';
import type { DomainError } from '../../../../@core/domain/domain-error.base.ts';
import type { PaymentNotification } from '../entities/payment-notification.entity.ts';
import type {
  ClaimPaymentNotificationOutput,
  ClaimPaymentNotificationParams,
  IPaymentNotificationRepository,
  PaymentNotificationId,
} from './payment-notification-repository.interface.ts';

export abstract class PaymentNotificationRepository implements IPaymentNotificationRepository {
  abstract claimForProcessing(params: ClaimPaymentNotificationParams): Promise<Result<ClaimPaymentNotificationOutput, DomainError>>;
  abstract findById(id: PaymentNotificationId): Promise<PaymentNotification | null>;
  abstract save(notification: PaymentNotification): Promise<Result<void, DomainError>>;
}
