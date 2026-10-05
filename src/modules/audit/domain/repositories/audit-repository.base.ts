import type { AuditFilter, IAuditRepository, ListAuditResult } from './audit-repository.interface';

export abstract class AuditRepository implements IAuditRepository {
  abstract list(filter: AuditFilter): Promise<ListAuditResult>;
  abstract listEntities(): Promise<string[]>;
}
