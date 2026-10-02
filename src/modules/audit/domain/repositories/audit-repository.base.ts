import type { AuditEntry } from '../entities/audit-entry.entity.ts';
import type {
  AuditEntriesForActorParams,
  AuditEntriesForAggregateParams,
  IAuditRepository,
} from './audit-repository.interface.ts';

export abstract class AuditRepository implements IAuditRepository {
  abstract append(entry: AuditEntry): Promise<void>;
  abstract listForAggregate(params: AuditEntriesForAggregateParams): Promise<AuditEntry[]>;
  abstract listForActor(params: AuditEntriesForActorParams): Promise<AuditEntry[]>;
}
