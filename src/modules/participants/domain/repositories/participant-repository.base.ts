import { Participant } from '../entities/participant.entity';
import type {
  FindParticipantByCpfParams,
  FindParticipantByEmailParams,
  FindParticipantByIdParams,
  IParticipantRepository,
  SaveParticipantParams,
} from './participant-repository.interface';
import type { Result } from '../../../../@core/domain/result';

export abstract class ParticipantRepository implements IParticipantRepository {
  abstract findById(params: FindParticipantByIdParams): Promise<Participant | null>;
  abstract findByEmail(params: FindParticipantByEmailParams): Promise<Participant | null>;
  abstract findByCpf(params: FindParticipantByCpfParams): Promise<Participant | null>;
  abstract save(params: SaveParticipantParams): Promise<Result<void>>;
}
