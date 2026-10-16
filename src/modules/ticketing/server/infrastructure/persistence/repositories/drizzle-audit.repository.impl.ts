import "server-only";
import { and, count, desc, ilike, or } from "drizzle-orm";
import { AuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import type { AuditListParams, AuditListResult, AuditRecord, AuditRecordView } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import { auditLogs } from "@/server/infrastructure/persistence/schema";
import type { Database } from "@/server/infrastructure/persistence/database";

import { auditClient, type AuditSeverity, type AuditActor } from "@/lib/audit";

export type DrizzleAuditRepositoryDependencies = { database: Database };

export class DrizzleAuditRepository extends AuditRepository {
  private readonly database: Database;
  constructor(dependencies: DrizzleAuditRepositoryDependencies) {
    super();
    this.database = dependencies.database;
  }

  async write(params: AuditRecord): Promise<void> {
    // 1. Gravação síncrona na tabela local audit_logs (PostgreSQL) para o /painel/auditoria
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

    // 2. Disparo assíncrono para o Upstash Redis para consolidação no RaroNexus / MongoDB Atlas
    try {
      let streamAction = params.action;
      if (params.action === "registration.waitlist_promoted") {
        streamAction = "waitlist.promoted";
      } else if (params.action === "payment.status_updated") {
        streamAction =
          params.afterData?.refundRequired === true
            ? "payment.refund_requested"
            : "payment.webhook_received";
      } else if (params.action === "certificates.issued") {
        streamAction = "certificate.issued";
      } else if (params.action.startsWith("event.status.")) {
        streamAction =
          params.action === "event.status.cancelado"
            ? "event.cancelled"
            : "event.status_changed";
      }

      const category = params.category || this.inferCategory(params.entity, streamAction);
      const severity = params.severity || this.inferSeverity(streamAction);
      const actor = this.resolveActor(params);
      const targets = params.targets || [
        {
          type: params.entity,
          id: params.recordId,
          label:
            (params.afterData?.title as string) ||
            (params.afterData?.registrationCode as string) ||
            `${params.entity}:${params.recordId}`,
        },
      ];

      let diff: { before: Record<string, unknown>; after: Record<string, unknown> } | undefined = undefined;
      const isModification =
        streamAction.endsWith(".updated") ||
        streamAction.endsWith(".status_changed") ||
        streamAction.endsWith(".reentry_authorized") ||
        streamAction.endsWith(".promoted");

      if (params.diff) {
        diff = params.diff;
      } else if (isModification && params.beforeData && params.afterData) {
        diff = {
          before: params.beforeData,
          after: params.afterData,
        };
      }

      auditClient.log({
        category,
        action: streamAction,
        severity,
        actor,
        context: {
          ip: params.ip,
          userAgent: params.userAgent || null,
        },
        targets,
        details: params.details || params.afterData || {},
        diff,
      });
    } catch (error) {
      console.warn("[DrizzleAuditRepository] Falha ao enviar auditoria para o stream:", error);
    }
  }

  private inferCategory(entity: string, action: string): string {
    if (action.startsWith("event.") || entity === "event") return "event";
    if (action.startsWith("registration.") || entity === "registration") return "registration";
    if (action.startsWith("payment.")) return "payment";
    if (action.startsWith("checkin.")) return "checkin";
    if (action.startsWith("certificate.")) return "certificate";
    if (action.startsWith("waitlist.")) return "waitlist";
    if (action.startsWith("coupon.")) return "coupon";
    if (action.startsWith("auth.")) return "auth";
    return entity || "system";
  }

  private inferSeverity(action: string): AuditSeverity {
    if (
      action === "event.cancelled" ||
      action === "payment.refund_requested" ||
      (action.endsWith(".cancelled") && action.startsWith("event"))
    ) {
      return "CRITICAL";
    }
    if (
      action.includes("duplicate") ||
      action.includes("rejected") ||
      action === "courtesy.granted" ||
      action.includes("forced") ||
      action === "payment.late_payment_flagged" ||
      action === "registration.cancelled"
    ) {
      return "WARNING";
    }
    return "INFO";
  }

  private resolveActor(params: AuditRecord): AuditActor {
    if (params.userId.startsWith("system:")) {
      return {
        type: "system",
        systemName: params.userName || params.userId,
      };
    }
    if (params.userId === "public") {
      return {
        type: "anonymous",
        name: params.userName || "Público",
      };
    }
    return {
      type: "user",
      userId: params.userId,
      name: params.userName,
      email: params.userEmail || undefined,
      role: params.userRole || null,
    };
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
