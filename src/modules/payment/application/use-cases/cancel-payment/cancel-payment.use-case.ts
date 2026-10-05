import { UseCase } from '@core/application/use-case.base';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { REGISTRATION_GATEWAY } from '@core/contracts/registration-gateway.contract';
import type { IRegistrationGateway } from '@core/contracts/registration-gateway.contract';
import { Result } from '@core/domain/result';
import { PaymentNotFoundError } from '../../../domain/errors/payment-not-found.error';
import { PAYMENT_REPOSITORY } from '../../../domain/repositories/payment-repository.interface';
import type { IPaymentRepository } from '../../../domain/repositories/payment-repository.interface';
import { PaymentMapper } from '../../mappers/payment.mapper';
import type { CancelPaymentInputDto } from './cancel-payment.input.dto';
import type { CancelPaymentOutputDto } from './cancel-payment.output.dto';

export type CancelPaymentDependencies = {
  paymentRepository: IPaymentRepository;
  registrationGateway: IRegistrationGateway;
  auditRecorder: IAuditRecorder;
  clock: IClock;
  mapper: PaymentMapper;
};

/** Cancelamento operacional do pagamento: libera a inscrição e a vaga (§27). */
export class CancelPaymentUseCase extends UseCase<CancelPaymentInputDto, CancelPaymentOutputDto> {
  private readonly dependencies: CancelPaymentDependencies;

  constructor(dependencies: CancelPaymentDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: CancelPaymentInputDto): Promise<Result<CancelPaymentOutputDto>> {
    const { paymentRepository, registrationGateway, auditRecorder, clock, mapper } = this.dependencies;
    const at = clock.now();

    const payment = await paymentRepository.findById(input.paymentId);
    if (!payment) return Result.fail(new PaymentNotFoundError(input.paymentId));

    const cancelResult = payment.cancel({ at, reason: input.reason });
    if (cancelResult.isFailure) return Result.fail(cancelResult.error);

    await paymentRepository.update(payment);
    await paymentRepository.saveEvent({
      paymentId: payment.id.toString(),
      registrationId: payment.registrationId,
      type: 'PAYMENT_CANCELLED',
      fromStatus: 'AGUARDANDO',
      toStatus: 'CANCELADO',
      providerStatus: payment.transaction.providerStatus,
      description: `Pagamento cancelado: ${input.reason}`,
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? null,
      occurredAt: at,
    });

    await registrationGateway.markPaymentFailed({
      registrationId: payment.registrationId,
      reason: `Pagamento cancelado: ${input.reason}`,
      at,
    });

    await auditRecorder.record({
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? 'Operador',
      action: 'PAYMENT_CANCELLED',
      entity: 'payment',
      entityId: payment.id.toString(),
      description: `Pagamento ${payment.reference.value} cancelado`,
      before: { status: 'AGUARDANDO' },
      after: { status: payment.status.value, reason: input.reason },
      ip: input.ip ?? null,
    });

    return Result.ok({ payment: mapper.map({ payment }) });
  }
}
