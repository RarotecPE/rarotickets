import type {
  IParticipantSessionRepository,
  ParticipantSessionRecord,
} from './participant-session-repository.interface';

export abstract class ParticipantSessionRepository implements IParticipantSessionRepository {
  abstract findByTokenHash(tokenHash: string): Promise<ParticipantSessionRecord | null>;
  abstract save(record: Omit<ParticipantSessionRecord, 'id' | 'createdAt' | 'revokedAt'>): Promise<void>;
  abstract revokeByTokenHash(tokenHash: string, at: Date): Promise<void>;
}
