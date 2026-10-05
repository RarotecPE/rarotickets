import { EventFormField } from '../entities/event-form-field.entity';

export type EventFormFieldId = string;
export type ListFormFieldsParams = { eventId: string; includeInactive?: boolean };

export interface IEventFormRepository {
  findById(id: EventFormFieldId): Promise<EventFormField | null>;
  findByKey(params: { eventId: string; fieldKey: string }): Promise<EventFormField | null>;
  listByEvent(params: ListFormFieldsParams): Promise<EventFormField[]>;
  save(field: EventFormField): Promise<void>;
  update(field: EventFormField): Promise<void>;
}

export const EVENT_FORM_REPOSITORY = Symbol('IEventFormRepository');
