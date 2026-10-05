import type { ParticipantDto } from '../../mappers/participant.mapper';

export type OpenParticipantSessionOutputDto = { token: string; expiresAt: Date; participant: ParticipantDto };
