export type AuditEntryParams = {
  actorUserId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  description?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
};

/**
 * Registro de auditoria (§36). Contrato de núcleo implementado pelo módulo
 * `audit` e consumido por qualquer módulo que execute operação sensível.
 */
export interface IAuditRecorder {
  record(params: AuditEntryParams): Promise<void>;
}

export const AUDIT_RECORDER = Symbol('IAuditRecorder');
