export type ParticipantSessionRecord = {
  id: string;
  participantId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
};

export interface IParticipantSessionRepository {
  findByTokenHash(tokenHash: string): Promise<ParticipantSessionRecord | null>;
  save(record: Omit<ParticipantSessionRecord, 'id' | 'createdAt' | 'revokedAt'>): Promise<void>;
  revokeByTokenHash(tokenHash: string, at: Date): Promise<void>;
}

export const PARTICIPANT_SESSION_REPOSITORY = Symbol('IParticipantSessionRepository');
