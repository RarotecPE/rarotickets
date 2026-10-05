import { buildPaginationMeta, normalizePagination } from '@core/application/pagination/pagination';
import { UseCase } from '@core/application/use-case.base';
import { Result } from '@core/domain/result';
import { PARTICIPANT_REPOSITORY } from '../../../domain/repositories/participant-repository.interface';
import type { IParticipantRepository } from '../../../domain/repositories/participant-repository.interface';
import { ParticipantMapper } from '../../mappers/participant.mapper';
import type { ListParticipantsInputDto } from './list-participants.input.dto';
import type { ListParticipantsOutputDto } from './list-participants.output.dto';

export type ListParticipantsDependencies = {
  participantRepository: IParticipantRepository;
  mapper: ParticipantMapper;
};

export class ListParticipantsUseCase extends UseCase<ListParticipantsInputDto, ListParticipantsOutputDto> {
  private readonly participantRepository: IParticipantRepository;
  private readonly mapper: ParticipantMapper;

  constructor(dependencies: ListParticipantsDependencies) {
    super();
    this.participantRepository = dependencies.participantRepository;
    this.mapper = dependencies.mapper;
  }

  async execute(input: ListParticipantsInputDto): Promise<Result<ListParticipantsOutputDto>> {
    const pagination = normalizePagination({ page: input.page, perPage: input.perPage });
    const { participants, total } = await this.participantRepository.search({
      search: input.search ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      company: input.company ?? null,
      page: pagination.page,
      perPage: pagination.perPage,
    });

    return Result.ok({
      participants: participants.map((participant) => this.mapper.map({ participant })),
      meta: buildPaginationMeta({ ...pagination, total }),
    });
  }
}
