import type { Event } from '../entities/event.entity';
import type { EventId, IEventRepository } from './event-repository.interface';

export abstract class EventRepository implements IEventRepository {
  abstract findAll(): Promise<Event[]>;
  abstract findById(id: EventId): Promise<Event | null>;
  abstract save(event: Event): Promise<void>;
  abstract update(event: Event): Promise<void>;
}
