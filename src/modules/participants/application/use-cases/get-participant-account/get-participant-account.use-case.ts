import { UseCase } from '../../../../../@core/application/use-case.base';
import { Result } from '../../../../../@core/domain/result';
import { ParticipantNotFoundError } from '../../../domain/errors/participant-not-found.error';
import type { IParticipantRepository } from '../../../domain/repositories/participant-repository.interface';
import { ParticipantMapper } from '../../mappers/participant.mapper';
import type { GetParticipantAccountInputDto } from './get-participant-account.input.dto';
import type { GetParticipantAccountOutputDto } from './get-participant-account.output.dto';

export type GetParticipantAccountDependencies = {
  participantRepository: IParticipantRepository;
  participantMapper: ParticipantMapper;
};

export class GetParticipantAccountUseCase extends UseCase<GetParticipantAccountInputDto, GetParticipantAccountOutputDto> {
  private readonly participantRepository: IParticipantRepository;
  private readonly participantMapper: ParticipantMapper;

  constructor(dependencies: GetParticipantAccountDependencies) {
    super();
    this.participantRepository = dependencies.participantRepository;
    this.participantMapper = dependencies.participantMapper;
  }

  async execute(input: GetParticipantAccountInputDto): Promise<Result<GetParticipantAccountOutputDto>> {
    const participant = await this.participantRepository.findById({ participantId: input.participantId });
    if (!participant) return Result.fail(new ParticipantNotFoundError({ participantId: input.participantId }));
    return Result.ok({ participant: this.participantMapper.map({ participant }) });
  }
}
