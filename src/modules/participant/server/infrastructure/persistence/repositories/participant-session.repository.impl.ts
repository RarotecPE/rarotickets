import { Identifier } from '@core/domain/identifier';
import type { IDatabaseClient } from '@server/infrastructure/database/database.client';
import { ParticipantSessionRepository } from '../../../../domain/repositories/participant-session-repository.base';
import type { ParticipantSessionRecord } from '../../../../domain/repositories/participant-session-repository.interface';
import type { ParticipantSessionModel } from '../models/participant.model';

export type ParticipantSessionRepositoryDependencies = { db: IDatabaseClient };

export class ParticipantSessionRepositoryImpl extends ParticipantSessionRepository {
  private readonly db: IDatabaseClient;

  constructor(dependencies: ParticipantSessionRepositoryDependencies) {
    super();
    this.db = dependencies.db;
  }

  async findByTokenHash(tokenHash: string): Promise<ParticipantSessionRecord | null> {
    const record = await this.db.queryOne<ParticipantSessionModel>({
      sql: 'SELECT * FROM participant_sessions WHERE token_hash = $1',
      params: [tokenHash],
    });
    if (!record) return null;

    return {
      id: record.id,
      participantId: record.participant_id,
      tokenHash: record.token_hash,
      expiresAt: record.expires_at,
      revokedAt: record.revoked_at,
      createdAt: record.created_at,
    };
  }

  async save(record: Omit<ParticipantSessionRecord, 'id' | 'createdAt' | 'revokedAt'>): Promise<void> {
    await this.db.execute({
      sql: `INSERT INTO participant_sessions (id, participant_id, token_hash, expires_at)
            VALUES ($1, $2, $3, $4)`,
      params: [Identifier.create().toString(), record.participantId, record.tokenHash, record.expiresAt],
    });
  }

  async revokeByTokenHash(tokenHash: string, at: Date): Promise<void> {
    await this.db.execute({
      sql: 'UPDATE participant_sessions SET revoked_at = $2 WHERE token_hash = $1 AND revoked_at IS NULL',
      params: [tokenHash, at],
    });
  }
}
