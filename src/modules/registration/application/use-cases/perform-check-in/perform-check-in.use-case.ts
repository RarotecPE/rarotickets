import { UseCase } from '@core/application/use-case.base';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { EVENT_CATALOG } from '@core/contracts/event-catalog.contract';
import type { IEventCatalog } from '@core/contracts/event-catalog.contract';
import { PARTICIPANT_GATEWAY } from '@core/contracts/participant-gateway.contract';
import type { IParticipantGateway } from '@core/contracts/participant-gateway.contract';
import { Result } from '@core/domain/result';
import { CheckInNotAllowedError } from '../../../domain/errors/check-in-not-allowed.error';
import { RegistrationNotFoundError } from '../../../domain/errors/registration-not-found.error';
import { REGISTRATION_REPOSITORY } from '../../../domain/repositories/registration-repository.interface';
import type { IRegistrationRepository } from '../../../domain/repositories/registration-repository.interface';
import { CredentialPayload } from '../../../domain/value-objects/credential.vo';
import { CredentialService } from '../../services/credential.service';
import { RegistrationMapper } from '../../mappers/registration.mapper';
import type { PerformCheckInInputDto } from './perform-check-in.input.dto';
import type { PerformCheckInOutputDto } from './perform-check-in.output.dto';

export type PerformCheckInDependencies = {
  registrationRepository: IRegistrationRepository;
  eventCatalog: IEventCatalog;
  participantGateway: IParticipantGateway;
  credentialService: CredentialService;
  auditRecorder: IAuditRecorder;
  clock: IClock;
  mapper: RegistrationMapper;
};

/**
 * Check-in do participante (§29): valida a credencial assinada, a situação da
 * inscrição e impede check-in duplicado — salvo operação administrativa
 * justificada e registrada.
 */
export class PerformCheckInUseCase extends UseCase<PerformCheckInInputDto, PerformCheckInOutputDto> {
  private readonly dependencies: PerformCheckInDependencies;

  constructor(dependencies: PerformCheckInDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: PerformCheckInInputDto): Promise<Result<PerformCheckInOutputDto>> {
    const { registrationRepository, eventCatalog, participantGateway, credentialService, auditRecorder, clock, mapper } =
      this.dependencies;

    const registration = await this.resolveRegistration(input);
    if (!registration) return Result.fail(new RegistrationNotFoundError(input.code ?? input.registrationId ?? 'credencial'));

    const at = clock.now();
    const checkInResult = registration.registerCheckIn({
      at,
      checkedInBy: input.actorUserId ?? null,
      operatorName: input.actorName ?? null,
      method: input.credentialToken ? 'QR_CODE' : 'MANUAL',
      isOverride: input.override ?? false,
      overrideReason: input.overrideReason ?? null,
    });
    if (checkInResult.isFailure) return Result.fail(checkInResult.error);

    await registrationRepository.saveCheckIn(checkInResult.value);
    await registrationRepository.update(registration);

    const [participant, rules] = await Promise.all([
      participantGateway.findById({ id: registration.participantId }),
      eventCatalog.getRegistrationRules({ eventId: registration.eventId }),
    ]);

    await auditRecorder.record({
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? 'Operador',
      action: 'CHECK_IN_PERFORMED',
      entity: 'registration',
      entityId: registration.id.toString(),
      description: `Check-in da inscrição ${registration.code.value}`,
      after: {
        checkedInAt: at.toISOString(),
        method: checkInResult.value.method,
        isOverride: checkInResult.value.isOverride,
      },
      ip: input.ip ?? null,
    });

    return Result.ok({
      registration: mapper.map({ registration }),
      participantName: participant?.name ?? null,
      eventTitle: rules?.title ?? null,
      checkedInAt: at,
      isOverride: checkInResult.value.isOverride,
    });
  }

  private async resolveRegistration(input: PerformCheckInInputDto) {
    if (input.registrationId) return this.dependencies.registrationRepository.findById(input.registrationId);

    if (input.credentialToken) {
      const parsed = CredentialPayload.parse(input.credentialToken);
      if (parsed.isFailure) return null;

      const registration = await this.dependencies.registrationRepository.findByCode(parsed.value.code);
      if (!registration) return null;

      const isValid = await this.dependencies.credentialService.assertSignature({
        code: parsed.value.code,
        signature: parsed.value.signature,
        registrationId: registration.id.toString(),
        eventId: registration.eventId,
      });
      if (!isValid) throw new CheckInNotAllowedError('CREDENCIAL_INVALIDA');

      return registration;
    }

    if (input.code) return this.dependencies.registrationRepository.findByCode(input.code);
    return null;
  }
}
