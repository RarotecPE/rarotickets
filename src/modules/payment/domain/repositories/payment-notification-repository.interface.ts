import type { Result } from '../../../../@core/domain/result.ts';
import type { DomainError } from '../../../../@core/domain/domain-error.base.ts';
import type {
  ClaimNotificationParams,
  PaymentNotification,
} from '../entities/payment-notification.entity.ts';

export type ClaimPaymentNotificationParams = ClaimNotificationParams & { notification: PaymentNotification };
export type ClaimPaymentNotificationOutput = { notification: PaymentNotification; claimed: boolean; wasDuplicate: boolean };
export type PaymentNotificationId = string;

export interface IPaymentNotificationRepository {
  claimForProcessing(params: ClaimPaymentNotificationParams): Promise<Result<ClaimPaymentNotificationOutput, DomainError>>;
  findById(id: PaymentNotificationId): Promise<PaymentNotification | null>;
  save(notification: PaymentNotification): Promise<Result<void, DomainError>>;
}
