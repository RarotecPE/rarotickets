import type { IDatabaseClient } from '@server/infrastructure/database/database.client';
import { AuditRepository } from '../../../../domain/repositories/audit-repository.base';
import type { AuditEntry, AuditFilter, ListAuditResult } from '../../../../domain/repositories/audit-repository.interface';

export type AuditRepositoryDependencies = { db: IDatabaseClient };

type AuditLogRow = {
  id: string;
  actor_user_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  description: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  ip: string | null;
  created_at: Date;
};

const FILTERS = `($1::uuid IS NULL OR actor_user_id = $1)
  AND ($2::text IS NULL OR entity = $2)
  AND ($3::text IS NULL OR action = $3)
  AND ($4::text IS NULL OR lower(coalesce(description, '')) LIKE $4
       OR lower(coalesce(actor_name, '')) LIKE $4 OR lower(entity_id) LIKE $4)
  AND ($5::timestamptz IS NULL OR created_at >= $5)
  AND ($6::timestamptz IS NULL OR created_at <= $6)`;

export class AuditRepositoryImpl extends AuditRepository {
  private readonly db: IDatabaseClient;

  constructor(dependencies: AuditRepositoryDependencies) {
    super();
    this.db = dependencies.db;
  }

  async list(filter: AuditFilter): Promise<ListAuditResult> {
    const params = [
      filter.actorUserId ?? null,
      filter.entity ?? null,
      filter.action ?? null,
      filter.search ? `%${filter.search.toLowerCase()}%` : null,
      filter.from ?? null,
      filter.to ?? null,
    ];

    const records = await this.db.query<AuditLogRow>({
      sql: `SELECT * FROM audit_logs WHERE ${FILTERS}
            ORDER BY created_at DESC LIMIT $7 OFFSET $8`,
      params: [...params, filter.perPage, (filter.page - 1) * filter.perPage],
    });

    const totalRow = await this.db.queryOne<{ total: string }>({
      sql: `SELECT COUNT(*)::text AS total FROM audit_logs WHERE ${FILTERS}`,
      params,
    });

    const entries: AuditEntry[] = records.map((record) => ({
      id: record.id,
      actorUserId: record.actor_user_id,
      actorName: record.actor_name,
      actorRole: record.actor_role,
      action: record.action,
      entity: record.entity,
      entityId: record.entity_id,
      description: record.description,
      before: record.before_data,
      after: record.after_data,
      ip: record.ip,
      createdAt: new Date(record.created_at),
    }));

    return { entries, total: Number(totalRow?.total ?? 0) };
  }

  async listEntities(): Promise<string[]> {
    const rows = await this.db.query<{ entity: string }>({
      sql: 'SELECT DISTINCT entity FROM audit_logs ORDER BY entity ASC',
    });
    return rows.map((row) => row.entity);
  }
}
