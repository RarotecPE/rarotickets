import { UseCase } from '@core/application/use-case.base';
import { Result } from '@core/domain/result';
import { ParticipantConsent } from '../../../domain/entities/participant-consent.entity';
import { ParticipantNotFoundError } from '../../../domain/errors/participant-not-found.error';
import { PARTICIPANT_CONSENT_REPOSITORY } from '../../../domain/repositories/participant-consent-repository.interface';
import type { IParticipantConsentRepository } from '../../../domain/repositories/participant-consent-repository.interface';
import { PARTICIPANT_REPOSITORY } from '../../../domain/repositories/participant-repository.interface';
import type { IParticipantRepository } from '../../../domain/repositories/participant-repository.interface';
import type { RegisterConsentInputDto } from './register-consent.input.dto';
import type { RegisterConsentOutputDto } from './register-consent.output.dto';

export type RegisterConsentDependencies = {
  participantRepository: IParticipantRepository;
  consentRepository: IParticipantConsentRepository;
};

/**
 * Registra (ou atualiza) consentimentos LGPD de forma versionada.
 * O aceite de marketing não é condição para inscrição (§37).
 */
export class RegisterConsentUseCase extends UseCase<RegisterConsentInputDto, RegisterConsentOutputDto> {
  private readonly participantRepository: IParticipantRepository;
  private readonly consentRepository: IParticipantConsentRepository;

  constructor(dependencies: RegisterConsentDependencies) {
    super();
    this.participantRepository = dependencies.participantRepository;
    this.consentRepository = dependencies.consentRepository;
  }

  async execute(input: RegisterConsentInputDto): Promise<Result<RegisterConsentOutputDto>> {
    const participant = await this.participantRepository.findById(input.participantId);
    if (!participant) return Result.fail(new ParticipantNotFoundError({ participantId: input.participantId }));

    for (const item of input.consents) {
      const existing = await this.consentRepository.findByTypeAndVersion({
        participantId: input.participantId,
        type: item.type,
        version: item.version,
      });
      if (existing) continue;

      const consentResult = ParticipantConsent.create({
        participantId: input.participantId,
        type: item.type,
        version: item.version,
        accepted: item.accepted,
        acceptedAt: item.accepted ? new Date() : null,
        ip: input.ip ?? null,
      });
      if (consentResult.isFailure) return Result.fail(consentResult.error);
      await this.consentRepository.save(consentResult.value);
    }

    const consents = await this.consentRepository.listByParticipant(input.participantId);
    return Result.ok({
      consents: consents.map((consent) => ({
        type: consent.type.value,
        version: consent.version,
        accepted: consent.accepted,
        acceptedAt: consent.acceptedAt,
      })),
    });
  }
}
