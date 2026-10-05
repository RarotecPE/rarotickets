import { UseCase } from '@core/application/use-case.base';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { PAYMENT_PROVIDER } from '@core/contracts/payment-provider.contract';
import type { IPaymentProvider } from '@core/contracts/payment-provider.contract';
import { Result } from '@core/domain/result';
import { PAYMENT_NOTIFICATION_REPOSITORY } from '../../../domain/repositories/payment-notification-repository.interface';
import type { IPaymentNotificationRepository } from '../../../domain/repositories/payment-notification-repository.interface';
import { PAYMENT_REPOSITORY } from '../../../domain/repositories/payment-repository.interface';
import type { IPaymentRepository } from '../../../domain/repositories/payment-repository.interface';
import { PaymentStatusSyncService } from '../../services/payment-status-sync.service';
import type { HandlePaymentWebhookInputDto } from './handle-payment-webhook.input.dto';
import type { HandlePaymentWebhookOutputDto } from './handle-payment-webhook.output.dto';

export type HandlePaymentWebhookDependencies = {
  paymentRepository: IPaymentRepository;
  notificationRepository: IPaymentNotificationRepository;
  paymentProvider: IPaymentProvider;
  syncService: PaymentStatusSyncService;
  clock: IClock;
};

/**
 * Recebe a notificação do provedor (§20). É idempotente: a mesma notificação
 * nunca é processada duas vezes e todo o histórico é preservado.
 */
export class HandlePaymentWebhookUseCase extends UseCase<
  HandlePaymentWebhookInputDto,
  HandlePaymentWebhookOutputDto
> {
  private readonly dependencies: HandlePaymentWebhookDependencies;

  constructor(dependencies: HandlePaymentWebhookDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: HandlePaymentWebhookInputDto): Promise<Result<HandlePaymentWebhookOutputDto>> {
    const { paymentRepository, notificationRepository, paymentProvider, syncService, clock } = this.dependencies;
    const at = clock.now();

    if (!paymentProvider.verifyWebhookSignature({ rawBody: input.rawBody, signature: input.signature ?? null })) {
      return Result.ok({
        received: false,
        duplicated: false,
        processed: false,
        outcome: null,
        message: 'Assinatura do webhook inválida',
      });
    }

    const parsed = paymentProvider.parseWebhook({ payload: input.payload });
    if (!parsed) {
      return Result.ok({
        received: false,
        duplicated: false,
        processed: false,
        outcome: null,
        message: 'Notificação não reconhecida',
      });
    }

    const registration = await notificationRepository.register({
      providerName: paymentProvider.providerName,
      notificationId: parsed.notificationId,
      paymentId: null,
      providerStatus: parsed.providerStatus,
      reference: parsed.reference,
      payload: parsed.raw,
      receivedAt: parsed.occurredAt ?? at,
    });

    const payment = parsed.providerChargeId
      ? await paymentRepository.findByProviderChargeId(parsed.providerChargeId)
      : parsed.reference
        ? await paymentRepository.findByReference(parsed.reference)
        : null;

    if (registration.status === 'DUPLICATED' && registration.notification.processedAt !== null) {
      return Result.ok({
        received: true,
        duplicated: true,
        processed: true,
        outcome: null,
        message: 'Notificação já processada anteriormente',
      });
    }

    if (!payment) {
      registration.notification.markFailed({ at, errorMessage: 'Pagamento não encontrado para a notificação' });
      await notificationRepository.update(registration.notification);
      return Result.ok({
        received: true,
        duplicated: registration.status === 'DUPLICATED',
        processed: false,
        outcome: null,
        message: 'Pagamento não encontrado para a notificação',
      });
    }

    const syncResult = await syncService.execute({
      payment,
      providerStatus: parsed.providerStatus,
      at,
      source: 'WEBHOOK',
      notificationId: parsed.notificationId,
    });
    if (syncResult.isFailure) {
      registration.notification.markFailed({ at, errorMessage: syncResult.error.message });
      await notificationRepository.update(registration.notification);
      return Result.fail(syncResult.error);
    }

    registration.notification.markProcessed({ at });
    await notificationRepository.update(registration.notification);

    return Result.ok({
      received: true,
      duplicated: registration.status === 'DUPLICATED',
      processed: true,
      outcome: syncResult.value.outcome,
      message: syncResult.value.message,
    });
  }
}
