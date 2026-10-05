import type { IDatabaseClient } from '@server/infrastructure/database/database.client';
import { SessionRepository } from '../../../../domain/repositories/session-repository.base';
import type { Session } from '../../../../domain/entities/session.entity';
import { SessionPersistenceMapper } from '../mappers/session-persistence.mapper';
import type { SessionModel } from '../models/session.model';

export type SessionRepositoryDependencies = { db: IDatabaseClient; mapper: SessionPersistenceMapper };

const COLUMNS = 'id, user_id, token_hash, expires_at, revoked_at, user_agent, ip, created_at';

export class SessionRepositoryImpl extends SessionRepository {
  private readonly db: IDatabaseClient;
  private readonly mapper: SessionPersistenceMapper;

  constructor(dependencies: SessionRepositoryDependencies) {
    super();
    this.db = dependencies.db;
    this.mapper = dependencies.mapper;
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const record = await this.db.queryOne<SessionModel>({
      sql: `SELECT ${COLUMNS} FROM sessions WHERE token_hash = $1`,
      params: [tokenHash],
    });
    return record ? this.mapper.toDomain({ record }) : null;
  }

  async save(session: Session): Promise<void> {
    const data = this.mapper.toPersistence({ entity: session });
    await this.db.execute({
      sql: `INSERT INTO sessions (id, user_id, token_hash, expires_at, revoked_at, user_agent, ip)
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      params: [data.id, data.user_id, data.token_hash, data.expires_at, data.revoked_at, data.user_agent, data.ip],
    });
  }

  async revokeByTokenHash(tokenHash: string, at: Date): Promise<void> {
    await this.db.execute({
      sql: 'UPDATE sessions SET revoked_at = $2 WHERE token_hash = $1 AND revoked_at IS NULL',
      params: [tokenHash, at],
    });
  }

  async revokeAllByUserId(userId: string, at: Date): Promise<void> {
    await this.db.execute({
      sql: 'UPDATE sessions SET revoked_at = $2 WHERE user_id = $1 AND revoked_at IS NULL',
      params: [userId, at],
    });
  }

  async deleteExpired(reference: Date): Promise<number> {
    return this.db.execute({ sql: 'DELETE FROM sessions WHERE expires_at < $1', params: [reference] });
  }
}
