import type { Participant } from '../entities/participant.entity';
import type {
  IParticipantRepository,
  ParticipantFilter,
  ListParticipantsResult,
  ParticipantId,
} from './participant-repository.interface';

export abstract class ParticipantRepository implements IParticipantRepository {
  abstract findById(id: ParticipantId): Promise<Participant | null>;
  abstract findByCpf(cpf: string): Promise<Participant | null>;
  abstract findByEmail(email: string): Promise<Participant | null>;
  abstract search(params: ParticipantFilter): Promise<ListParticipantsResult>;
  abstract save(participant: Participant): Promise<void>;
  abstract update(participant: Participant): Promise<void>;
}
