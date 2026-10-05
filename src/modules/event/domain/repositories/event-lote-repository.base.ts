import type { EventLote } from '../entities/event-lote.entity';
import type {
  EventLoteId,
  IEventLoteRepository,
  ListLotesParams,
} from './event-lote-repository.interface';

export abstract class EventLoteRepository implements IEventLoteRepository {
  abstract findById(id: EventLoteId): Promise<EventLote | null>;
  abstract listByEvent(params: ListLotesParams): Promise<EventLote[]>;
  abstract save(lote: EventLote): Promise<void>;
  abstract update(lote: EventLote): Promise<void>;
}
