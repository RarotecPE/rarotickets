import type { Event } from '../entities/event.entity';

export type EventId = string;

export interface IEventRepository {
  findAll(): Promise<Event[]>;
  findById(id: EventId): Promise<Event | null>;
  save(event: Event): Promise<void>;
  update(event: Event): Promise<void>;
}

export const EVENT_REPOSITORY = Symbol('IEventRepository');
