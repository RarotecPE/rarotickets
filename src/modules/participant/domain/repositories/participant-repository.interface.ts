import type { Participant } from '../entities/participant.aggregate.ts';

export type ParticipantId = string;
export type ParticipantQuery = { limit: number; offset: number };

export interface IParticipantRepository {
  findById(id: ParticipantId): Promise<Participant | null>;
  save(participant: Participant): Promise<void>;
  list(params: ParticipantQuery): Promise<Participant[]>;
}
