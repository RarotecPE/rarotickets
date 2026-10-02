import type { Event } from '../entities/event.aggregate.ts';
import type { EventId, EventQuery, IEventRepository } from './event-repository.interface.ts';

export abstract class EventRepository implements IEventRepository {
  abstract findById(id: EventId): Promise<Event | null>;
  abstract save(event: Event): Promise<void>;
  abstract list(params: EventQuery): Promise<Event[]>;
}
