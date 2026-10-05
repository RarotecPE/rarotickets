import type { IDatabaseClient } from '@server/infrastructure/database/database.client';
import type { Certificate } from '../../../../domain/entities/certificate.entity';
import { CertificateRepository } from '../../../../domain/repositories/certificate-repository.base';
import type {
  CertificateFilter,
  ListCertificatesResult,
} from '../../../../domain/repositories/certificate-repository.interface';
import { CertificatePersistenceMapper } from '../mappers/certificate-persistence.mapper';
import type { CertificateModel } from '../models/certificate.model';

export type CertificateRepositoryDependencies = {
  db: IDatabaseClient;
  mapper: CertificatePersistenceMapper;
};

const COLUMNS = `id, registration_id, event_id, participant_id, code, validation_hash, workload_hours,
  participant_name, participant_cpf, event_title, activities_summary, validation_url, issued_at,
  issued_by, revoked_at, revoke_reason, created_at`;

export class CertificateRepositoryImpl extends CertificateRepository {
  private readonly db: IDatabaseClient;
  private readonly mapper: CertificatePersistenceMapper;

  constructor(dependencies: CertificateRepositoryDependencies) {
    super();
    this.db = dependencies.db;
    this.mapper = dependencies.mapper;
  }

  async findById(id: string): Promise<Certificate | null> {
    const record = await this.db.queryOne<CertificateModel>({
      sql: `SELECT ${COLUMNS} FROM certificates WHERE id = $1`,
      params: [id],
    });
    return record ? this.mapper.toDomain({ record }) : null;
  }

  async findByCode(code: string): Promise<Certificate | null> {
    const record = await this.db.queryOne<CertificateModel>({
      sql: `SELECT ${COLUMNS} FROM certificates WHERE upper(code) = upper($1)`,
      params: [code],
    });
    return record ? this.mapper.toDomain({ record }) : null;
  }

  async findByRegistrationId(registrationId: string): Promise<Certificate | null> {
    const record = await this.db.queryOne<CertificateModel>({
      sql: `SELECT ${COLUMNS} FROM certificates WHERE registration_id = $1`,
      params: [registrationId],
    });
    return record ? this.mapper.toDomain({ record }) : null;
  }

  async list(filter: CertificateFilter): Promise<ListCertificatesResult> {
    const search = filter.search ? `%${filter.search.toLowerCase()}%` : null;
    const filters = `($1::uuid IS NULL OR event_id = $1)
      AND ($2::uuid IS NULL OR participant_id = $2)
      AND ($3::text IS NULL OR lower(code) LIKE $3 OR lower(coalesce(participant_name, '')) LIKE $3
           OR lower(coalesce(event_title, '')) LIKE $3)`;

    const records = await this.db.query<CertificateModel>({
      sql: `SELECT ${COLUMNS} FROM certificates WHERE ${filters}
            ORDER BY issued_at DESC LIMIT $4 OFFSET $5`,
      params: [filter.eventId ?? null, filter.participantId ?? null, search, filter.perPage, (filter.page - 1) * filter.perPage],
    });

    const totalRow = await this.db.queryOne<{ total: string }>({
      sql: `SELECT COUNT(*)::text AS total FROM certificates WHERE ${filters}`,
      params: [filter.eventId ?? null, filter.participantId ?? null, search],
    });

    return {
      certificates: records.map((record) => this.mapper.toDomain({ record })),
      total: Number(totalRow?.total ?? 0),
    };
  }

  async listByEvent(eventId: string): Promise<Certificate[]> {
    const records = await this.db.query<CertificateModel>({
      sql: `SELECT ${COLUMNS} FROM certificates WHERE event_id = $1 ORDER BY issued_at DESC`,
      params: [eventId],
    });
    return records.map((record) => this.mapper.toDomain({ record }));
  }

  async save(certificate: Certificate): Promise<void> {
    const data = this.mapper.toPersistence({ entity: certificate });
    await this.db.execute({
      sql: `INSERT INTO certificates (id, registration_id, event_id, participant_id, code, validation_hash,
              workload_hours, participant_name, participant_cpf, event_title, activities_summary, validation_url,
              issued_at, issued_by, revoked_at, revoke_reason, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            ON CONFLICT (registration_id) DO UPDATE
              SET code = EXCLUDED.code, workload_hours = EXCLUDED.workload_hours,
                  participant_name = EXCLUDED.participant_name, participant_cpf = EXCLUDED.participant_cpf,
                  event_title = EXCLUDED.event_title, activities_summary = EXCLUDED.activities_summary,
                  validation_url = EXCLUDED.validation_url, issued_at = EXCLUDED.issued_at,
                  issued_by = EXCLUDED.issued_by, revoked_at = EXCLUDED.revoked_at,
                  revoke_reason = EXCLUDED.revoke_reason`,
      params: [
        data.id, data.registration_id, data.event_id, data.participant_id, data.code, data.validation_hash,
        data.workload_hours, data.participant_name, data.participant_cpf, data.event_title, data.activities_summary,
        data.validation_url, data.issued_at, data.issued_by, data.revoked_at, data.revoke_reason, data.created_at,
      ],
    });
  }

  async update(certificate: Certificate): Promise<void> {
    const data = this.mapper.toPersistence({ entity: certificate });
    await this.db.execute({
      sql: `UPDATE certificates SET code = $2, workload_hours = $3, participant_name = $4,
              participant_cpf = $5, event_title = $6, activities_summary = $7, validation_url = $8,
              revoked_at = $9, revoke_reason = $10
            WHERE id = $1`,
      params: [
        data.id, data.code, data.workload_hours, data.participant_name, data.participant_cpf,
        data.event_title, data.activities_summary, data.validation_url, data.revoked_at, data.revoke_reason,
      ],
    });
  }
}
