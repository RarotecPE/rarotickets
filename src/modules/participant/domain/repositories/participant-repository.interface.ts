import { Participant } from '../entities/participant.entity';

export type ParticipantId = string;
export type ParticipantFilter = {
  search?: string | null;
  city?: string | null;
  state?: string | null;
  company?: string | null;
  page: number;
  perPage: number;
};
export type ListParticipantsResult = { participants: Participant[]; total: number };

export interface IParticipantRepository {
  findById(id: ParticipantId): Promise<Participant | null>;
  findByCpf(cpf: string): Promise<Participant | null>;
  findByEmail(email: string): Promise<Participant | null>;
  search(params: ParticipantFilter): Promise<ListParticipantsResult>;
  save(participant: Participant): Promise<void>;
  update(participant: Participant): Promise<void>;
}

export const PARTICIPANT_REPOSITORY = Symbol('IParticipantRepository');
