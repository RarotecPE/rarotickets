import type { PaginationMeta } from '@core/application/pagination/pagination';
import type { ParticipantDto } from '../../mappers/participant.mapper';

export type ListParticipantsOutputDto = { participants: ParticipantDto[]; meta: PaginationMeta };
