export type AuditRecord = {
  userId: string;
  userName: string;
  action: string;
  entity: string;
  recordId: string;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  ip: string | null;
};

export interface IAuditRepository {
  write(params: AuditRecord): Promise<void>;
  list(params: AuditListParams): Promise<AuditListResult>;
}

export type AuditListParams = { query?: string; page: number; pageSize: number };
export type AuditListResult = { items: AuditRecordView[]; total: number };
export type AuditRecordView = AuditRecord & { id: string; createdAt: Date };

export abstract class AuditRepository implements IAuditRepository {
  abstract write(params: AuditRecord): Promise<void>;
  abstract list(params: AuditListParams): Promise<AuditListResult>;
}
