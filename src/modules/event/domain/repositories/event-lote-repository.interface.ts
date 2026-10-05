import { EventLote } from '../entities/event-lote.entity';

export type EventLoteId = string;
export type ListLotesParams = { eventId: string; includeInactive?: boolean };

export interface IEventLoteRepository {
  findById(id: EventLoteId): Promise<EventLote | null>;
  listByEvent(params: ListLotesParams): Promise<EventLote[]>;
  save(lote: EventLote): Promise<void>;
  update(lote: EventLote): Promise<void>;
}

export const EVENT_LOTE_REPOSITORY = Symbol('IEventLoteRepository');
