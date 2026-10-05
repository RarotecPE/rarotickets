export type AuditEntry = {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  description: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  createdAt: Date;
};

export type AuditFilter = {
  actorUserId?: string | null;
  entity?: string | null;
  action?: string | null;
  search?: string | null;
  from?: Date | null;
  to?: Date | null;
  page: number;
  perPage: number;
};

export type ListAuditResult = { entries: AuditEntry[]; total: number };

export interface IAuditRepository {
  list(filter: AuditFilter): Promise<ListAuditResult>;
  listEntities(): Promise<string[]>;
}

export const AUDIT_REPOSITORY = Symbol('IAuditRepository');
