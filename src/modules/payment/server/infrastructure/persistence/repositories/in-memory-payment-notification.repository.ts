import { NotFoundError } from '../../../../../../@core/domain/errors/domain-errors.ts';
import { Result } from '../../../../../../@core/domain/result.ts';
import type { DomainError } from '../../../../../../@core/domain/domain-error.base.ts';
import { PaymentNotification } from '../../../../domain/entities/payment-notification.entity.ts';
import { PaymentNotificationRepository } from '../../../../domain/repositories/payment-notification-repository.base.ts';
import type {
  ClaimPaymentNotificationOutput,
  ClaimPaymentNotificationParams,
  PaymentNotificationId,
} from '../../../../domain/repositories/payment-notification-repository.interface.ts';

export class InMemoryPaymentNotificationRepository extends PaymentNotificationRepository {
  private readonly notifications = new Map<PaymentNotificationId, PaymentNotification>();

  public async claimForProcessing(
    params: ClaimPaymentNotificationParams,
  ): Promise<Result<ClaimPaymentNotificationOutput, DomainError>> {
    const id = params.notification.id.toString();
    let notification = this.notifications.get(id);
    const wasDuplicate = Boolean(notification);
    if (!notification) {
      notification = params.notification;
      this.notifications.set(id, notification);
    } else {
      const delivery = notification.recordDelivery({ receivedAt: params.now, payloadDigest: params.notification.payloadDigest });
      if (delivery.isFailure) return Result.fail(delivery.error);
    }
    const claimed = notification.claim({ now: params.now, leaseMilliseconds: params.leaseMilliseconds });
    if (claimed.isFailure) return Result.fail(claimed.error);
    return Result.ok({ notification, claimed: claimed.value, wasDuplicate });
  }

  public async findById(id: PaymentNotificationId): Promise<PaymentNotification | null> {
    return this.notifications.get(id) ?? null;
  }

  public async save(notification: PaymentNotification): Promise<Result<void, DomainError>> {
    const id = notification.id.toString();
    if (!this.notifications.has(id)) {
      return Result.fail(new NotFoundError({ code: 'PAYMENT_NOTIFICATION_NOT_FOUND', message: 'Notificação de pagamento não encontrada.' }));
    }
    this.notifications.set(id, notification);
    return Result.ok();
  }
}
