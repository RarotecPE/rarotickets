import type { AuditEntryParams, IAuditRecorder } from '@core/contracts/audit.contract';
import type { IDatabaseClient } from '@server/infrastructure/database/database.client';
import type { ILogger } from '@server/infrastructure/logger/logger';

export type AuditRecorderDependencies = { db: IDatabaseClient; logger: ILogger };

/** Trilha de auditoria (§36): quem, quando, o quê, valores anteriores e novos. */
export class PostgresAuditRecorder implements IAuditRecorder {
  private readonly db: IDatabaseClient;
  private readonly logger: ILogger;

  constructor(dependencies: AuditRecorderDependencies) {
    this.db = dependencies.db;
    this.logger = dependencies.logger;
  }

  async record(params: AuditEntryParams): Promise<void> {
    try {
      await this.db.execute({
        sql: `INSERT INTO audit_logs (id, actor_user_id, actor_name, actor_role, action, entity,
                entity_id, description, before_data, after_data, metadata, ip, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12, now())`,
        params: [
          generateUuid(),
          params.actorUserId ?? null,
          params.actorName ?? null,
          params.actorRole ?? null,
          params.action,
          params.entity,
          params.entityId ?? null,
          params.description ?? null,
          params.before ? JSON.stringify(params.before) : null,
          params.after ? JSON.stringify(params.after) : null,
          JSON.stringify(params.metadata ?? {}),
          params.ip ?? null,
        ],
      });
    } catch (error) {
      // Auditoria nunca derruba a operação de negócio, mas precisa ser visível.
      this.logger.error('Falha ao registrar auditoria', {
        action: params.action,
        entity: params.entity,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
