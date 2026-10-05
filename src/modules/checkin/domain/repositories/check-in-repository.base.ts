import type { CheckInRecord } from '../entities/check-in-record.entity';
import type { CheckInStats } from '../value-objects/check-in-stats.vo';
import type { CheckInFilter, CheckInLookup, ICheckInRepository, ListCheckInsResult } from './check-in-repository.interface';

export abstract class CheckInRepository implements ICheckInRepository {
  abstract listByEvent(filter: CheckInFilter): Promise<ListCheckInsResult>;
  abstract statsByEvent(eventId: string): Promise<CheckInStats>;
  abstract lookupByCode(params: { code: string; eventId?: string | null }): Promise<CheckInLookup | null>;
}
