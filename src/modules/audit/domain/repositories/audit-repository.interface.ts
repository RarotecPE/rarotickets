import type { AuditEntry } from '../entities/audit-entry.entity.ts';

export type AuditEntriesForAggregateParams = { aggregateType: string; aggregateId: string };
export type AuditEntriesForActorParams = { actorId: string; from: Date; to: Date };

/** Audit history is append-only; implementations must not expose update/delete operations. */
export interface IAuditRepository {
  append(entry: AuditEntry): Promise<void>;
  listForAggregate(params: AuditEntriesForAggregateParams): Promise<AuditEntry[]>;
  listForActor(params: AuditEntriesForActorParams): Promise<AuditEntry[]>;
}
