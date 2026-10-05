import type { ParticipantDto } from '../../mappers/participant.mapper';

export type ResolveParticipantOutputDto = {
  status: 'CREATED' | 'FOUND' | 'UPDATED';
  participant: ParticipantDto;
};
