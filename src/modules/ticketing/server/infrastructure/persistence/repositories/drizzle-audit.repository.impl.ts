import "server-only";
import { and, asc, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { AuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import type { AuditListParams, AuditListResult, AuditRecord, AuditRecordView } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import { auditLogs } from "@/server/infrastructure/persistence/schema";
import type { Database } from "@/server/infrastructure/persistence/database";

import { auditClient, type AuditSeverity, type AuditActor, type AuditEnvelopeInput } from "@/lib/audit";

export type DrizzleAuditRepositoryDependencies = { database: Database };

export class DrizzleAuditRepository extends AuditRepository {
  private readonly database: Database;
  private hasForwardedAtColumn: boolean | null = null;

  constructor(dependencies: DrizzleAuditRepositoryDependencies) {
    super();
    this.database = dependencies.database;
  }

  private async checkHasForwardedAt(): Promise<boolean> {
    if (this.hasForwardedAtColumn !== null) return this.hasForwardedAtColumn;
    try {
      const res = await this.database.execute(
        sql`SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'forwarded_at' LIMIT 1`
      );
      this.hasForwardedAtColumn = Array.isArray(res) && res.length > 0;
    } catch {
      this.hasForwardedAtColumn = false;
    }
    return this.hasForwardedAtColumn;
  }

  async write(params: AuditRecord): Promise<void> {
    // 1. Gravação síncrona na tabela local audit_logs (PostgreSQL) para o /painel/auditoria
    const [inserted] = await this.database
      .insert(auditLogs)
      .values({
        userId: params.userId,
        userName: params.userName,
        action: params.action,
        entity: params.entity,
        recordId: params.recordId,
        beforeData: params.beforeData,
        afterData: params.afterData,
        ip: params.ip,
      })
      .returning({ id: auditLogs.id });

    // 2. Disparo assíncrono para o Upstash Redis para consolidação no RaroNexus / MongoDB Atlas
    try {
      const options = this.buildEnvelopeOptions(params);
      const sent = await auditClient.log(options);

      // Marca forwarded_at no registro local se enviado com sucesso (e se a coluna existir)
      if (sent && inserted?.id) {
        const hasCol = await this.checkHasForwardedAt();
        if (hasCol) {
          await this.database
            .update(auditLogs)
            .set({ forwardedAt: new Date() })
            .where(eq(auditLogs.id, inserted.id))
            .catch((err) => console.warn("[DrizzleAuditRepository] Falha ao marcar forwarded_at:", err));
        }
      }
    } catch (error) {
      console.warn("[DrizzleAuditRepository] Falha ao enviar auditoria para o stream:", error);
    }
  }

  /**
   * Reenvia logs locais pendentes (onde forwarded_at é NULL) para a fila unificada do Upstash Redis.
   * Atua como Relay de Outbox caso tenha ocorrido oscilação temporária de rede.
   */
  async relayPending(limit = 50): Promise<number> {
    try {
      const hasCol = await this.checkHasForwardedAt();
      if (!hasCol) return 0;

      const pending = await this.database
        .select()
        .from(auditLogs)
        .where(isNull(auditLogs.forwardedAt))
        .orderBy(asc(auditLogs.createdAt))
        .limit(limit);

      if (pending.length === 0) return 0;

      let relayedCount = 0;
      for (const record of pending) {
        const options = this.buildEnvelopeOptions({
          userId: record.userId,
          userName: record.userName,
          action: record.action,
          entity: record.entity,
          recordId: record.recordId,
          beforeData: record.beforeData,
          afterData: record.afterData,
          ip: record.ip ?? null,
        });

        const sent = await auditClient.log(options);
        if (sent) {
          await this.database
            .update(auditLogs)
            .set({ forwardedAt: new Date() })
            .where(eq(auditLogs.id, record.id));
          relayedCount++;
        } else {
          // Interrompe se o Redis estiver inacessível para preservar ordenação
          break;
        }
      }

      return relayedCount;
    } catch (err) {
      console.warn("[DrizzleAuditRepository] Erro no relay de logs pendentes:", err);
      return 0;
    }
  }

  private buildEnvelopeOptions(params: AuditRecord): AuditEnvelopeInput {
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

    return {
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
    };
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
    // Drenagem assíncrona transparente de pendências do Outbox Relay
    this.relayPending().catch(() => {});

    const filters = [];
    if (params.query?.trim()) {
      const search = `%${params.query.trim()}%`;
      filters.push(or(ilike(auditLogs.userName, search), ilike(auditLogs.action, search), ilike(auditLogs.entity, search), ilike(auditLogs.recordId, search)));
    }
    const whereClause = filters.length ? and(...filters) : undefined;
    const [totalRow] = await this.database.select({ value: count() }).from(auditLogs).where(whereClause);

    const pageSize = Math.min(Math.max(params.pageSize, 1), 100);
    const offset = (Math.max(params.page, 1) - 1) * pageSize;
    const hasForwardedAt = await this.checkHasForwardedAt();

    if (hasForwardedAt) {
      const rows = await this.database
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(pageSize)
        .offset(offset);

      const items: AuditRecordView[] = rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        userName: row.userName,
        action: row.action,
        entity: row.entity,
        recordId: row.recordId,
        beforeData: row.beforeData,
        afterData: row.afterData,
        ip: row.ip,
        forwardedAt: row.forwardedAt,
        createdAt: row.createdAt,
      }));
      return { items, total: Number(totalRow?.value ?? 0) };
    }

    const rows = await this.database
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userName: auditLogs.userName,
        action: auditLogs.action,
        entity: auditLogs.entity,
        recordId: auditLogs.recordId,
        beforeData: auditLogs.beforeData,
        afterData: auditLogs.afterData,
        ip: auditLogs.ip,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(pageSize)
      .offset(offset);

    const items: AuditRecordView[] = rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      action: row.action,
      entity: row.entity,
      recordId: row.recordId,
      beforeData: row.beforeData,
      afterData: row.afterData,
      ip: row.ip,
      forwardedAt: null,
      createdAt: row.createdAt,
    }));
    return { items, total: Number(totalRow?.value ?? 0) };
  }
}
