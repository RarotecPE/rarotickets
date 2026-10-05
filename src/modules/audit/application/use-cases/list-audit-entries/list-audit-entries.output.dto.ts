import type { PaginationMeta } from '@core/application/pagination/pagination';
import type { AuditEntry } from '../../../domain/repositories/audit-repository.interface';

export type ListAuditEntriesOutputDto = { entries: AuditEntry[]; entities: string[]; meta: PaginationMeta };
