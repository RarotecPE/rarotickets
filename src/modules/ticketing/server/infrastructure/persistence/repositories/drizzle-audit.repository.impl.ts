import "server-only";
import { and, count, desc, ilike, or } from "drizzle-orm";
import { AuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import type { AuditListParams, AuditListResult, AuditRecord, AuditRecordView } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import { auditLogs } from "@/server/infrastructure/persistence/schema";
import type { Database } from "@/server/infrastructure/persistence/database";

export type DrizzleAuditRepositoryDependencies = { database: Database };

export class DrizzleAuditRepository extends AuditRepository {
  private readonly database: Database;
  constructor(dependencies: DrizzleAuditRepositoryDependencies) {
    super();
    this.database = dependencies.database;
  }

  async write(params: AuditRecord): Promise<void> {
    await this.database.insert(auditLogs).values({
      userId: params.userId,
      userName: params.userName,
      action: params.action,
      entity: params.entity,
      recordId: params.recordId,
      beforeData: params.beforeData,
      afterData: params.afterData,
      ip: params.ip,
    });
  }

  async list(params: AuditListParams): Promise<AuditListResult> {
    const filters = [];
    if (params.query?.trim()) {
      const search = `%${params.query.trim()}%`;
      filters.push(or(ilike(auditLogs.userName, search), ilike(auditLogs.action, search), ilike(auditLogs.entity, search), ilike(auditLogs.recordId, search)));
    }
    const whereClause = filters.length ? and(...filters) : undefined;
    const [totalRow] = await this.database.select({ value: count() }).from(auditLogs).where(whereClause);
    const rows = await this.database.select().from(auditLogs).where(whereClause).orderBy(desc(auditLogs.createdAt)).limit(Math.min(Math.max(params.pageSize, 1), 100)).offset((Math.max(params.page, 1) - 1) * Math.min(Math.max(params.pageSize, 1), 100));
    const items: AuditRecordView[] = rows.map((row) => ({ id: row.id, userId: row.userId, userName: row.userName, action: row.action, entity: row.entity, recordId: row.recordId, beforeData: row.beforeData, afterData: row.afterData, ip: row.ip, createdAt: row.createdAt }));
    return { items, total: Number(totalRow?.value ?? 0) };
  }
}
