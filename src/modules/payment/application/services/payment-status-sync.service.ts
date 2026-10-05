import { ApplicationService } from '@core/application/application-service.base';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import type { INotificationGateway } from '@core/contracts/notification.contract';
import type { IRegistrationGateway } from '@core/contracts/registration-gateway.contract';
import { Result } from '@core/domain/result';
import type { Payment } from '../../domain/entities/payment.entity';
import type { IPaymentRepository } from '../../domain/repositories/payment-repository.interface';
import { mapProviderStatus } from '../../domain/services/payment-status.mapper';

export type PaymentSyncSource = 'WEBHOOK' | 'RECONCILIACAO' | 'MANUAL';

export type SyncPaymentParams = {
  payment: Payment;
  providerStatus: string;
  at: Date;
  source: PaymentSyncSource;
  actorUserId?: string | null;
  actorName?: string | null;
  notificationId?: string | null;
};

export type PaymentSyncOutcome = {
  outcome: 'APPLIED' | 'IGNORED' | 'REQUIRES_REVIEW';
  internalStatus: string;
  message: string;
  registrationStatus: string | null;
};

export type PaymentStatusSyncDependencies = {
  paymentRepository: IPaymentRepository;
  registrationGateway: IRegistrationGateway;
  notificationGateway: INotificationGateway;
  auditRecorder: IAuditRecorder;
};

/**
 * Aplica o status do provedor ao pagamento e propaga os efeitos para a
 * inscrição. É usado tanto pelo webhook quanto pelo job de reconciliação (§18, §21).
 */
export class PaymentStatusSyncService extends ApplicationService<SyncPaymentParams, PaymentSyncOutcome> {
  private readonly paymentRepository: IPaymentRepository;
  private readonly registrationGateway: IRegistrationGateway;
  private readonly notificationGateway: INotificationGateway;
  private readonly auditRecorder: IAuditRecorder;

  constructor(dependencies: PaymentStatusSyncDependencies) {
    super();
    this.paymentRepository = dependencies.paymentRepository;
    this.registrationGateway = dependencies.registrationGateway;
    this.notificationGateway = dependencies.notificationGateway;
    this.auditRecorder = dependencies.auditRecorder;
  }

  async execute(params: SyncPaymentParams): Promise<Result<PaymentSyncOutcome>> {
    const { payment, at } = params;
    const internalStatus = mapProviderStatus(params.providerStatus);

    if (!internalStatus) {
      return Result.ok({
        outcome: 'IGNORED',
        internalStatus: payment.status.value,
        message: `Status do provedor "${params.providerStatus}" não possui mapeamento interno`,
        registrationStatus: null,
      });
    }

    const previousStatus = payment.status.value;
    if (previousStatus === internalStatus) {
      return Result.ok({
        outcome: 'IGNORED',
        internalStatus,
        message: 'Pagamento já está neste status',
        registrationStatus: null,
      });
    }

    let registrationStatus: string | null = null;
    let requiresReview = false;
    let message = `Pagamento atualizado para ${internalStatus}`;

    switch (internalStatus) {
      case 'PAGO': {
        const paid = payment.markPaid({ at, providerStatus: params.providerStatus });
        if (paid.isFailure) return Result.fail(paid.error);

        const confirmation = await this.registrationGateway.confirmAfterPayment({
          registrationId: payment.registrationId,
          paymentMethod: payment.method.value,
          at,
        });
        registrationStatus = confirmation.status;
        if (confirmation.status === 'CONFIRMED' || confirmation.status === 'ALREADY_CONFIRMED') {
          message = 'Pagamento confirmado e inscrição confirmada';
        } else if (confirmation.status === 'WAITLISTED') {
          message = 'Pagamento confirmado; inscrição segue na lista de espera e será promovida conforme disponibilidade';
        } else if (confirmation.status === 'SEAT_UNAVAILABLE') {
          requiresReview = true;
          message = 'Pagamento confirmado, porém não há vaga disponível — requer análise da equipe';
        } else {
          requiresReview = true;
          message = 'message' in confirmation ? confirmation.message : 'Pagamento confirmado para inscrição cancelada';
        }
        break;
      }
      case 'RECUSADO': {
        const refused = payment.markRefused({ at, providerStatus: params.providerStatus, reason: 'Pagamento recusado pelo provedor' });
        if (refused.isFailure) return Result.fail(refused.error);
        await this.registrationGateway.markPaymentFailed({
          registrationId: payment.registrationId,
          reason: 'Pagamento recusado pelo provedor',
          at,
        });
        registrationStatus = 'CANCELLED';
        break;
      }
      case 'CANCELADO':
      case 'EXPIRADO': {
        const transition = internalStatus === 'CANCELADO'
          ? payment.cancel({ at, reason: 'Pagamento cancelado no provedor' })
          : payment.expire({ at, reason: 'Pagamento expirado no provedor' });
        if (transition.isFailure) return Result.fail(transition.error);
        await this.registrationGateway.expireReservation({
          registrationId: payment.registrationId,
          at,
          reason: 'Pagamento não concluído dentro do prazo',
        });
        registrationStatus = 'EXPIRED';
        break;
      }
      case 'ESTORNADO': {
        const refund = payment.refund({ at, reason: 'Estorno registrado pelo provedor' });
        if (refund.isFailure) return Result.fail(refund.error);
        break;
      }
      default: {
        const awaiting = payment.markAwaiting({
          providerChargeId: payment.transaction.providerChargeId ?? '',
          providerStatus: params.providerStatus,
          transaction: payment.transaction,
          expiresAt: payment.expiresAt,
        });
        if (awaiting.isFailure) return Result.fail(awaiting.error);
        break;
      }
    }

    await this.paymentRepository.update(payment);
    await this.paymentRepository.saveEvent({
      paymentId: payment.id.toString(),
      registrationId: payment.registrationId,
      type: `PAYMENT_${internalStatus}`,
      fromStatus: previousStatus,
      toStatus: internalStatus,
      providerStatus: params.providerStatus,
      description: `${params.source === 'WEBHOOK' ? 'Webhook' : params.source === 'RECONCILIACAO' ? 'Reconciliação' : 'Operação manual'}: ${message}`,
      actorUserId: params.actorUserId ?? null,
      actorName: params.actorName ?? null,
      occurredAt: at,
    });

    await this.notifyPayment({ payment, internalStatus, at });

    await this.auditRecorder.record({
      actorUserId: params.actorUserId ?? null,
      actorName: params.actorName ?? 'Sistema',
      action: `PAYMENT_${internalStatus}`,
      entity: 'payment',
      entityId: payment.id.toString(),
      description: `Pagamento ${payment.reference.value}: ${previousStatus} → ${internalStatus}`,
      before: { status: previousStatus },
      after: { status: internalStatus, providerStatus: params.providerStatus, registrationStatus },
    });

    return Result.ok({
      outcome: requiresReview ? 'REQUIRES_REVIEW' : 'APPLIED',
      internalStatus,
      message,
      registrationStatus,
    });
  }

  private async notifyPayment(params: { payment: Payment; internalStatus: string; at: Date }): Promise<void> {
    const { payment } = params;
    const template = params.internalStatus === 'PAGO'
      ? 'PAGAMENTO_CONFIRMADO'
      : params.internalStatus === 'RECUSADO'
        ? 'PAGAMENTO_RECUSADO'
        : null;
    if (!template) return;

    const snapshot = await this.registrationGateway.getSnapshot({ registrationId: payment.registrationId });
    await this.notificationGateway.send({
      template,
      registrationId: payment.registrationId,
      eventId: payment.eventId,
      participantId: payment.participantId,
      variables: {
        referencia: payment.reference.value,
        valor: payment.amount.format(),
        inscricao: snapshot?.code ?? '',
      },
    });
  }
}
