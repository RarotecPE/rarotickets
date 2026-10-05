import { UseCase } from '@core/application/use-case.base';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { EVENT_CATALOG } from '@core/contracts/event-catalog.contract';
import type { IEventCatalog } from '@core/contracts/event-catalog.contract';
import { NOTIFICATION_GATEWAY } from '@core/contracts/notification.contract';
import type { INotificationGateway } from '@core/contracts/notification.contract';
import { PARTICIPANT_GATEWAY } from '@core/contracts/participant-gateway.contract';
import type { IParticipantGateway } from '@core/contracts/participant-gateway.contract';
import { Result } from '@core/domain/result';
import { addMinutes } from '../../../../../shared/utils/date.util';
import { RegistrationNotFoundError } from '../../../domain/errors/registration-not-found.error';
import { REGISTRATION_REPOSITORY } from '../../../domain/repositories/registration-repository.interface';
import type { IRegistrationRepository } from '../../../domain/repositories/registration-repository.interface';
import { RegistrationMapper } from '../../mappers/registration.mapper';
import type { PromoteFromWaitlistInputDto } from './promote-from-waitlist.input.dto';
import type { PromoteFromWaitlistOutputDto } from './promote-from-waitlist.output.dto';

export type PromoteFromWaitlistDependencies = {
  registrationRepository: IRegistrationRepository;
  eventCatalog: IEventCatalog;
  participantGateway: IParticipantGateway;
  notificationGateway: INotificationGateway;
  auditRecorder: IAuditRecorder;
  clock: IClock;
  mapper: RegistrationMapper;
};

/**
 * Promoção da lista de espera (§26). Só promove quando existe vaga disponível;
 * em evento pago a vaga fica reservada até a confirmação do pagamento (§4).
 */
export class PromoteFromWaitlistUseCase extends UseCase<
  PromoteFromWaitlistInputDto,
  PromoteFromWaitlistOutputDto
> {
  private readonly dependencies: PromoteFromWaitlistDependencies;

  constructor(dependencies: PromoteFromWaitlistDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: PromoteFromWaitlistInputDto): Promise<Result<PromoteFromWaitlistOutputDto>> {
    const { registrationRepository, eventCatalog, participantGateway, notificationGateway, auditRecorder, clock, mapper } =
      this.dependencies;

    const registration = await registrationRepository.findById(input.registrationId);
    if (!registration) return Result.fail(new RegistrationNotFoundError(input.registrationId));
    if (!registration.status.isWaitlisted()) {
      return Result.fail(new Error('Inscrição não está na lista de espera'));
    }

    const at = clock.now();
    const [usage, rules] = await Promise.all([
      eventCatalog.getSeatUsage({ eventId: registration.eventId }),
      eventCatalog.getRegistrationRules({ eventId: registration.eventId }),
    ]);
    if (!usage || !rules) return Result.fail(new Error('Evento da inscrição não encontrado'));
    if (usage.availableSeats <= 0) {
      return Result.fail(new Error('Não há vaga disponível para promover esta inscrição'));
    }

    const isFree = registration.finalAmount.isZero();
    const promoteResult = registration.promoteFromWaitlist({
      at,
      isFree,
      reservationExpiresAt: isFree ? null : addMinutes(at, rules.seatReservationMinutes),
    });
    if (promoteResult.isFailure) return Result.fail(promoteResult.error);

    await registrationRepository.update(registration);

    const participant = await participantGateway.findById({ id: registration.participantId });
    await notificationGateway.send({
      template: 'PROMOCAO_LISTA_ESPERA',
      registrationId: registration.id.toString(),
      eventId: registration.eventId,
      participantId: registration.participantId,
      destination: participant?.email ?? null,
      variables: { codigo: registration.code.value, evento: rules.title },
    });

    await auditRecorder.record({
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? 'Sistema',
      action: 'REGISTRATION_PROMOTED_FROM_WAITLIST',
      entity: 'registration',
      entityId: registration.id.toString(),
      description: `Inscrição ${registration.code.value} promovida da lista de espera`,
      before: { status: 'LISTA_ESPERA' },
      after: { status: registration.status.value, seatStatus: registration.seatStatus.value },
      ip: input.ip ?? null,
    });

    return Result.ok({
      registration: mapper.map({ registration }),
      requiresPayment: registration.isPayable(),
    });
  }
}
