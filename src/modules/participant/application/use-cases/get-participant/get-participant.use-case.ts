import { UseCase } from '@core/application/use-case.base';
import { Result } from '@core/domain/result';
import { ParticipantNotFoundError } from '../../../domain/errors/participant-not-found.error';
import { PARTICIPANT_CONSENT_REPOSITORY } from '../../../domain/repositories/participant-consent-repository.interface';
import type { IParticipantConsentRepository } from '../../../domain/repositories/participant-consent-repository.interface';
import { PARTICIPANT_REPOSITORY } from '../../../domain/repositories/participant-repository.interface';
import type { IParticipantRepository } from '../../../domain/repositories/participant-repository.interface';
import { ParticipantMapper } from '../../mappers/participant.mapper';
import type { GetParticipantInputDto } from './get-participant.input.dto';
import type { GetParticipantOutputDto } from './get-participant.output.dto';

export type GetParticipantDependencies = {
  participantRepository: IParticipantRepository;
  consentRepository: IParticipantConsentRepository;
  mapper: ParticipantMapper;
};

export class GetParticipantUseCase extends UseCase<GetParticipantInputDto, GetParticipantOutputDto> {
  private readonly participantRepository: IParticipantRepository;
  private readonly consentRepository: IParticipantConsentRepository;
  private readonly mapper: ParticipantMapper;

  constructor(dependencies: GetParticipantDependencies) {
    super();
    this.participantRepository = dependencies.participantRepository;
    this.consentRepository = dependencies.consentRepository;
    this.mapper = dependencies.mapper;
  }

  async execute(input: GetParticipantInputDto): Promise<Result<GetParticipantOutputDto>> {
    const participant = await this.participantRepository.findById(input.participantId);
    if (!participant) return Result.fail(new ParticipantNotFoundError({ participantId: input.participantId }));

    const consents = await this.consentRepository.listByParticipant(input.participantId);
    return Result.ok({ participant: this.mapper.map({ participant, consents }) });
  }
}
