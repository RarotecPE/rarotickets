import type { Session } from '../entities/session.entity';
import type { ISessionRepository } from './session-repository.interface';

export abstract class SessionRepository implements ISessionRepository {
  abstract findByTokenHash(tokenHash: string): Promise<Session | null>;
  abstract save(session: Session): Promise<void>;
  abstract revokeByTokenHash(tokenHash: string, at: Date): Promise<void>;
  abstract revokeAllByUserId(userId: string, at: Date): Promise<void>;
  abstract deleteExpired(reference: Date): Promise<number>;
}
