import { PersistenceMapper } from '@core/application/persistence-mapper.base';
import type { ToDomainParams, ToPersistenceParams } from '@core/application/persistence-mapper.base';
import { Identifier } from '@core/domain/identifier';
import { Session } from '../../../../domain/entities/session.entity';
import type { SessionModel, SessionModelData } from '../models/session.model';

export type SessionToDomainParams = ToDomainParams<SessionModel>;
export type SessionToPersistenceParams = ToPersistenceParams<Session>;

export class SessionPersistenceMapper extends PersistenceMapper<Session, SessionModel, SessionModelData> {
  public toDomain({ record }: SessionToDomainParams): Session {
    return Session.reconstitute({
      props: {
        userId: record.user_id,
        tokenHash: record.token_hash,
        expiresAt: record.expires_at,
        revokedAt: record.revoked_at,
        userAgent: record.user_agent,
        ip: record.ip,
      },
      id: Identifier.fromExisting(record.id),
      createdAt: record.created_at,
      updatedAt: record.created_at,
    });
  }

  public toPersistence({ entity }: SessionToPersistenceParams): SessionModelData {
    return {
      id: entity.id.toString(),
      user_id: entity.userId,
      token_hash: entity.tokenHash,
      expires_at: entity.expiresAt,
      revoked_at: entity.revokedAt,
      user_agent: null,
      ip: null,
      created_at: entity.createdAt,
    };
  }
}
