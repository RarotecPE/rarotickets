import type { EventFormField } from '../entities/event-form-field.entity';
import type {
  EventFormFieldId,
  IEventFormRepository,
  ListFormFieldsParams,
} from './event-form-repository.interface';

export abstract class EventFormRepository implements IEventFormRepository {
  abstract findById(id: EventFormFieldId): Promise<EventFormField | null>;
  abstract findByKey(params: { eventId: string; fieldKey: string }): Promise<EventFormField | null>;
  abstract listByEvent(params: ListFormFieldsParams): Promise<EventFormField[]>;
  abstract save(field: EventFormField): Promise<void>;
  abstract update(field: EventFormField): Promise<void>;
}
