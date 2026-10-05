import { UseCase } from '@core/application/use-case.base';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { NOTIFICATION_GATEWAY } from '@core/contracts/notification.contract';
import type { INotificationGateway } from '@core/contracts/notification.contract';
import { PAYMENT_PROVIDER } from '@core/contracts/payment-provider.contract';
import type { IPaymentProvider } from '@core/contracts/payment-provider.contract';
import { Result } from '@core/domain/result';
import { PaymentNotFoundError } from '../../../domain/errors/payment-not-found.error';
import { PaymentRefundNotAllowedError } from '../../../domain/errors/payment-refund-not-allowed.error';
import { PAYMENT_REPOSITORY } from '../../../domain/repositories/payment-repository.interface';
import type { IPaymentRepository } from '../../../domain/repositories/payment-repository.interface';
import { PaymentMapper } from '../../mappers/payment.mapper';
import type { RefundPaymentInputDto } from './refund-payment.input.dto';
import type { RefundPaymentOutputDto } from './refund-payment.output.dto';

export type RefundPaymentDependencies = {
  paymentRepository: IPaymentRepository;
  paymentProvider: IPaymentProvider;
  notificationGateway: INotificationGateway;
  auditRecorder: IAuditRecorder;
  clock: IClock;
  mapper: PaymentMapper;
};

/** Estorno com histórico obrigatório (§22). */
export class RefundPaymentUseCase extends UseCase<RefundPaymentInputDto, RefundPaymentOutputDto> {
  private readonly dependencies: RefundPaymentDependencies;

  constructor(dependencies: RefundPaymentDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: RefundPaymentInputDto): Promise<Result<RefundPaymentOutputDto>> {
    const { paymentRepository, paymentProvider, notificationGateway, auditRecorder, clock, mapper } = this.dependencies;
    const at = clock.now();

    const payment = input.paymentId
      ? await paymentRepository.findById(input.paymentId)
      : input.reference
        ? await paymentRepository.findByReference(input.reference)
        : null;
    if (!payment) return Result.fail(new PaymentNotFoundError(input.paymentId ?? input.reference ?? ''));

    if (!payment.isRefundable()) {
      return Result.fail(new PaymentRefundNotAllowedError('Somente pagamentos confirmados e não estornados podem ser estornados'));
    }
    if (!input.reason || input.reason.trim().length < 5) {
      return Result.fail(new PaymentRefundNotAllowedError('Estorno exige justificativa com ao menos 5 caracteres'));
    }

    const chargeId = payment.transaction.providerChargeId;
    let providerRefundId: string | null = null;
    if (chargeId) {
      const refundResult = await paymentProvider.refundCharge({
        providerChargeId: chargeId,
        amountCents: input.amountCents ?? undefined,
      });
      if (refundResult.status === 'FAILED') {
        return Result.fail(new PaymentRefundNotAllowedError(`Estorno recusado pelo provedor: ${refundResult.message}`));
      }
      providerRefundId = refundResult.providerRefundId;
    }

    const refundResult = payment.refund({ at, reason: input.reason.trim(), amountCents: input.amountCents ?? null });
    if (refundResult.isFailure) return Result.fail(refundResult.error);

    await paymentRepository.update(payment);
    await paymentRepository.saveEvent({
      paymentId: payment.id.toString(),
      registrationId: payment.registrationId,
      type: 'PAYMENT_REFUNDED',
      fromStatus: 'PAGO',
      toStatus: 'ESTORNADO',
      providerStatus: payment.transaction.providerStatus,
      description: `Estorno de ${input.amountCents ?? payment.amount.cents} centavos: ${input.reason.trim()}`,
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? null,
      occurredAt: at,
    });

    await notificationGateway.send({
      template: 'PAGAMENTO_RECUSADO',
      registrationId: payment.registrationId,
      eventId: payment.eventId,
      participantId: payment.participantId,
      variables: {
        referencia: payment.reference.value,
        valor: payment.amount.format(),
        motivo: input.reason.trim(),
      },
    });

    await auditRecorder.record({
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? 'Financeiro',
      action: 'PAYMENT_REFUNDED',
      entity: 'payment',
      entityId: payment.id.toString(),
      description: `Pagamento ${payment.reference.value} estornado`,
      before: { status: 'PAGO' },
      after: {
        status: payment.status.value,
        refundedAmountCents: payment.refundedAmountCents,
        reason: payment.refundReason,
        providerRefundId,
      },
      ip: input.ip ?? null,
    });

    return Result.ok({
      payment: mapper.map({ payment }),
      refundedAmountCents: payment.refundedAmountCents ?? 0,
      providerRefundId,
    });
  }
}
