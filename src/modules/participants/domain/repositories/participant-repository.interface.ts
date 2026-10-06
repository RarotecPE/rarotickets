import type { Result } from '../../../../@core/domain/result';
import type { Participant } from '../entities/participant.entity';
import type { ParticipantCpf } from '../value-objects/participant-cpf.vo';
import type { ParticipantEmail } from '../value-objects/participant-email.vo';

export type ParticipantId = string;
export type SaveParticipantParams = { participant: Participant };
export type FindParticipantByIdParams = { participantId: ParticipantId };
export type FindParticipantByEmailParams = { email: ParticipantEmail };
export type FindParticipantByCpfParams = { cpf: ParticipantCpf };

export interface IParticipantRepository {
  findById(params: FindParticipantByIdParams): Promise<Participant | null>;
  findByEmail(params: FindParticipantByEmailParams): Promise<Participant | null>;
  findByCpf(params: FindParticipantByCpfParams): Promise<Participant | null>;
  save(params: SaveParticipantParams): Promise<Result<void>>;
}

export const PARTICIPANT_REPOSITORY = Symbol('IParticipantRepository');
