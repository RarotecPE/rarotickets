import type {
  HashParticipantPasswordParams,
  IParticipantPasswordHasher,
  VerifyParticipantPasswordParams,
} from '../../../domain/services/participant-password-hasher.interface';

export abstract class ParticipantPasswordHasher implements IParticipantPasswordHasher {
  abstract hash(params: HashParticipantPasswordParams): Promise<string>;
  abstract verify(params: VerifyParticipantPasswordParams): Promise<boolean>;
}
