import type { Event } from '../entities/event.entity';
import type {
  EventFilter,
  EventId,
  EventSeatUsageSnapshot,
  IEventRepository,
  ListEventsResult,
} from './event-repository.interface';

export abstract class EventRepository implements IEventRepository {
  abstract findById(id: EventId): Promise<Event | null>;
  abstract findBySlug(slug: string): Promise<Event | null>;
  abstract existsBySlug(slug: string, ignoreEventId?: EventId): Promise<boolean>;
  abstract list(params: EventFilter): Promise<ListEventsResult>;
  abstract listForStatusSync(at: Date): Promise<Event[]>;
  abstract getSeatUsage(eventId: EventId): Promise<EventSeatUsageSnapshot | null>;
  abstract getSeatUsageForEvents(eventIds: EventId[]): Promise<EventSeatUsageSnapshot[]>;
  abstract save(event: Event): Promise<void>;
  abstract update(event: Event): Promise<void>;
}
