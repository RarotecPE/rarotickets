import { UseCase } from '@core/application/use-case.base';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { COUPON_CATALOG } from '@core/contracts/coupon-catalog.contract';
import type { ICouponCatalog } from '@core/contracts/coupon-catalog.contract';
import { NOTIFICATION_GATEWAY } from '@core/contracts/notification.contract';
import type { INotificationGateway } from '@core/contracts/notification.contract';
import { PARTICIPANT_GATEWAY } from '@core/contracts/participant-gateway.contract';
import type { IParticipantGateway } from '@core/contracts/participant-gateway.contract';
import { Result } from '@core/domain/result';
import { RegistrationNotFoundError } from '../../../domain/errors/registration-not-found.error';
import { REGISTRATION_REPOSITORY } from '../../../domain/repositories/registration-repository.interface';
import type { IRegistrationRepository } from '../../../domain/repositories/registration-repository.interface';
import { RegistrationMapper } from '../../mappers/registration.mapper';
import type { CancelRegistrationInputDto } from './cancel-registration.input.dto';
import type { CancelRegistrationOutputDto } from './cancel-registration.output.dto';

export type CancelRegistrationDependencies = {
  registrationRepository: IRegistrationRepository;
  participantGateway: IParticipantGateway;
  couponCatalog: ICouponCatalog;
  notificationGateway: INotificationGateway;
  auditRecorder: IAuditRecorder;
  clock: IClock;
  mapper: RegistrationMapper;
};

/**
 * Cancelamento de inscrição (§27): libera a vaga, devolve o cupom e sinaliza
 * a necessidade de avaliação financeira. Não realiza estorno automaticamente —
 * cancelamento de inscrição e cancelamento financeiro são operações distintas.
 */
export class CancelRegistrationUseCase extends UseCase<CancelRegistrationInputDto, CancelRegistrationOutputDto> {
  private readonly dependencies: CancelRegistrationDependencies;

  constructor(dependencies: CancelRegistrationDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: CancelRegistrationInputDto): Promise<Result<CancelRegistrationOutputDto>> {
    const { registrationRepository, couponCatalog, notificationGateway, auditRecorder, clock, mapper } =
      this.dependencies;

    const registration = input.code
      ? await registrationRepository.findByCode(input.code)
      : input.registrationId
        ? await registrationRepository.findById(input.registrationId)
        : null;
    if (!registration) return Result.fail(new RegistrationNotFoundError(input.code ?? input.registrationId ?? ''));

    const hadSeat = registration.seatStatus.blocksSeat();
    const wasConfirmed = registration.status.isConfirmed();

    const cancelResult = registration.cancel({
      at: clock.now(),
      reason: input.reason,
      cancelledBy: input.actorUserId ?? null,
      isAdministrative: input.isAdministrative ?? false,
    });
    if (cancelResult.isFailure) return Result.fail(cancelResult.error);

    await registrationRepository.update(registration);
    if (registration.couponCode) await couponCatalog.release({ registrationId: registration.id.toString() });

    const participant = await this.dependencies.participantGateway.findById({ id: registration.participantId });

    await notificationGateway.send({
      template: 'INSCRICAO_CANCELADA',
      registrationId: registration.id.toString(),
      eventId: registration.eventId,
      participantId: registration.participantId,
      destination: participant?.email ?? null,
      variables: { codigo: registration.code.value, motivo: input.reason },
    });

    await auditRecorder.record({
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? 'Participante',
      action: 'REGISTRATION_CANCELLED',
      entity: 'registration',
      entityId: registration.id.toString(),
      description: `Inscrição ${registration.code.value} cancelada`,
      before: { status: wasConfirmed ? 'CONFIRMADA' : registration.status.value, seatStatus: registration.seatStatus.value },
      after: { status: registration.status.value, seatStatus: registration.seatStatus.value, reason: input.reason },
      ip: input.ip ?? null,
    });

    return Result.ok({
      registration: mapper.map({ registration }),
      seatReleased: hadSeat,
      financialReviewRequired: !registration.finalAmount.isZero(),
    });
  }
}
