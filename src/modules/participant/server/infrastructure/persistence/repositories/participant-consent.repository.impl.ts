import type { IDatabaseClient } from '@server/infrastructure/database/database.client';
import type { ParticipantConsent } from '../../../../domain/entities/participant-consent.entity';
import { ParticipantConsentRepository } from '../../../../domain/repositories/participant-consent-repository.base';
import { ParticipantConsentPersistenceMapper } from '../mappers/participant-persistence.mapper';
import type { ParticipantConsentModel } from '../models/participant.model';

export type ParticipantConsentRepositoryDependencies = {
  db: IDatabaseClient;
  mapper: ParticipantConsentPersistenceMapper;
};

export class ParticipantConsentRepositoryImpl extends ParticipantConsentRepository {
  private readonly db: IDatabaseClient;
  private readonly mapper: ParticipantConsentPersistenceMapper;

  constructor(dependencies: ParticipantConsentRepositoryDependencies) {
    super();
    this.db = dependencies.db;
    this.mapper = dependencies.mapper;
  }

  async listByParticipant(participantId: string): Promise<ParticipantConsent[]> {
    const records = await this.db.query<ParticipantConsentModel>({
      sql: `SELECT * FROM participant_consents WHERE participant_id = $1 ORDER BY created_at ASC`,
      params: [participantId],
    });
    return records.map((record) => this.mapper.toDomain({ record }));
  }

  async findByTypeAndVersion(params: {
    participantId: string;
    type: string;
    version: string;
  }): Promise<ParticipantConsent | null> {
    const record = await this.db.queryOne<ParticipantConsentModel>({
      sql: `SELECT * FROM participant_consents
            WHERE participant_id = $1 AND type = $2 AND version = $3`,
      params: [params.participantId, params.type, params.version],
    });
    return record ? this.mapper.toDomain({ record }) : null;
  }

  async save(consent: ParticipantConsent): Promise<void> {
    const data = this.mapper.toPersistence({ entity: consent });
    await this.db.execute({
      sql: `INSERT INTO participant_consents (id, participant_id, type, version, accepted, accepted_at, ip)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (participant_id, type, version) DO UPDATE
              SET accepted = EXCLUDED.accepted, accepted_at = EXCLUDED.accepted_at, ip = EXCLUDED.ip`,
      params: [data.id, data.participant_id, data.type, data.version, data.accepted, data.accepted_at, data.ip],
    });
  }
}
