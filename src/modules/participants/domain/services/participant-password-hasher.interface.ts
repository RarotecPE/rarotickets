export type HashParticipantPasswordParams = { password: string };
export type VerifyParticipantPasswordParams = { password: string; passwordHash: string };

export interface IParticipantPasswordHasher {
  hash(params: HashParticipantPasswordParams): Promise<string>;
  verify(params: VerifyParticipantPasswordParams): Promise<boolean>;
}

export const PARTICIPANT_PASSWORD_HASHER = Symbol('IParticipantPasswordHasher');
