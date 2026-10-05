import type { CheckInRecord } from '../entities/check-in-record.entity';
import type { CheckInStats } from '../value-objects/check-in-stats.vo';

export type CheckInFilter = {
  eventId: string;
  search?: string | null;
  onlyOverrides?: boolean;
  page: number;
  perPage: number;
};

export type ListCheckInsResult = { records: CheckInRecord[]; total: number };

export type CheckInLookup = {
  registrationId: string;
  registrationCode: string;
  eventId: string;
  eventTitle: string;
  participantId: string;
  participantName: string;
  participantEmail: string | null;
  status: string;
  hasCheckedIn: boolean;
  checkedInAt: Date | null;
  canCheckIn: boolean;
  reason: string | null;
};

export interface ICheckInRepository {
  listByEvent(filter: CheckInFilter): Promise<ListCheckInsResult>;
  statsByEvent(eventId: string): Promise<CheckInStats>;
  lookupByCode(params: { code: string; eventId?: string | null }): Promise<CheckInLookup | null>;
}

export const CHECKIN_REPOSITORY = Symbol('ICheckInRepository');
