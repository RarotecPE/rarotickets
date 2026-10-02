import { AuditRepository } from '../../../../domain/repositories/audit-repository.base.ts';
import type { AuditEntriesForActorParams, AuditEntriesForAggregateParams } from '../../../../domain/repositories/audit-repository.interface.ts';
import type { AuditEntry } from '../../../../domain/entities/audit-entry.entity.ts';

/** Append-only adapter useful for local flows and tests. */
export class InMemoryAuditRepository extends AuditRepository {
  private readonly entries = new Map<string, AuditEntry>();

  public async append(entry: AuditEntry): Promise<void> {
    const id = entry.id.toString();
    if (!this.entries.has(id)) this.entries.set(id, entry);
  }

  public async listForAggregate(params: AuditEntriesForAggregateParams): Promise<AuditEntry[]> {
    return [...this.entries.values()]
      .filter((entry) => entry.aggregateType === params.aggregateType && entry.aggregateId === params.aggregateId)
      .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
  }

  public async listForActor(params: AuditEntriesForActorParams): Promise<AuditEntry[]> {
    return [...this.entries.values()]
      .filter((entry) => entry.actorId === params.actorId
        && entry.occurredAt.getTime() >= params.from.getTime()
        && entry.occurredAt.getTime() <= params.to.getTime())
      .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
  }
}
