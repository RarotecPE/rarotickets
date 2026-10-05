import { Event } from '../entities/event.entity';
import type { EventStatusValue } from '../value-objects/event-status.vo';

export type EventId = string;
export type EventSeatUsageSnapshot = {
  eventId: string;
  capacity: number;
  occupiedSeats: number;
  reservedSeats: number;
  waitlistCount: number;
  availableSeats: number;
};
export type EventFilter = {
  search?: string | null;
  status?: EventStatusValue | null;
  type?: 'GRATUITO' | 'PAGO' | null;
  city?: string | null;
  state?: string | null;
  startDateFrom?: Date | null;
  startDateTo?: Date | null;
  onlyPublic?: boolean;
  onlyUpcoming?: boolean;
  page: number;
  perPage: number;
};
export type ListEventsResult = { events: Event[]; total: number };

export interface IEventRepository {
  findById(id: EventId): Promise<Event | null>;
  findBySlug(slug: string): Promise<Event | null>;
  existsBySlug(slug: string, ignoreEventId?: EventId): Promise<boolean>;
  list(params: EventFilter): Promise<ListEventsResult>;
  listForStatusSync(at: Date): Promise<Event[]>;
  getSeatUsage(eventId: EventId): Promise<EventSeatUsageSnapshot | null>;
  getSeatUsageForEvents(eventIds: EventId[]): Promise<EventSeatUsageSnapshot[]>;
  save(event: Event): Promise<void>;
  update(event: Event): Promise<void>;
}

export const EVENT_REPOSITORY = Symbol('IEventRepository');
