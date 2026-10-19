export type AuditRecord = {
  userId: string;
  userName: string;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  entity: string;
  recordId: string;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  ip: string | null;
  userAgent?: string | null;
  category?: string;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  details?: Record<string, unknown>;
  targets?: Array<{ type: string; id: string; label: string }>;
  diff?: { before: Record<string, unknown>; after: Record<string, unknown> };
};

export interface IAuditRepository {
  write(params: AuditRecord): Promise<void>;
  list(params: AuditListParams): Promise<AuditListResult>;
  relayPending?(limit?: number): Promise<number>;
}

export type AuditListParams = { query?: string; page: number; pageSize: number };
export type AuditListResult = { items: AuditRecordView[]; total: number };
export type AuditRecordView = AuditRecord & { id: string; createdAt: Date; forwardedAt?: Date | null };

export abstract class AuditRepository implements IAuditRepository {
  abstract write(params: AuditRecord): Promise<void>;
  abstract list(params: AuditListParams): Promise<AuditListResult>;
  abstract relayPending?(limit?: number): Promise<number>;
}
