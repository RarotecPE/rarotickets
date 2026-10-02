import type { Event } from '../entities/event.aggregate.ts';
import type { EventStatus } from '../value-objects/event.types.ts';

export type EventId = string;
export type EventQuery = { statuses: EventStatus[]; limit: number; offset: number };

export interface IEventRepository {
  findById(id: EventId): Promise<Event | null>;
  save(event: Event): Promise<void>;
  list(params: EventQuery): Promise<Event[]>;
}
