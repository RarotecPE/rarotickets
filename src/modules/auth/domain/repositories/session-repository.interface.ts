import { Session } from '../entities/session.entity';

export type SessionId = string;

export interface ISessionRepository {
  findByTokenHash(tokenHash: string): Promise<Session | null>;
  save(session: Session): Promise<void>;
  revokeByTokenHash(tokenHash: string, at: Date): Promise<void>;
  revokeAllByUserId(userId: string, at: Date): Promise<void>;
  deleteExpired(reference: Date): Promise<number>;
}

export const SESSION_REPOSITORY = Symbol('ISessionRepository');
