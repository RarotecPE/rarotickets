import type { Participant } from '../entities/participant.aggregate.ts';
import type { IParticipantRepository, ParticipantId, ParticipantQuery } from './participant-repository.interface.ts';

export abstract class ParticipantRepository implements IParticipantRepository {
  abstract findById(id: ParticipantId): Promise<Participant | null>;
  abstract save(participant: Participant): Promise<void>;
  abstract list(params: ParticipantQuery): Promise<Participant[]>;
}
