import type { Event, EventProps } from "../entities/event.aggregate";
import type { FormFieldType } from "../../registrations/services/registration-form.domain-service";

export type EventLotReadModel = {
  id: string;
  name: string;
  priceCents: number;
  maxQuantity: number;
  soldCount: number;
  startAt: Date;
  endAt: Date;
  active: boolean;
  sortOrder: number;
};
export type EventFormFieldReadModel = {
  id: string;
  label: string;
  description: string | null;
  type: FormFieldType;
  required: boolean;
  options: string[];
  displayOrder: number;
};
export type EventActivityReadModel = {
  id: string;
  title: string;
  description: string;
  speakerName: string;
  speakerBio: string | null;
  room: string | null;
  startAt: Date;
  endAt: Date;
};
export type EventCapacityReadModel = { confirmed: number; reserved: number; waitlisted: number };
export type EventReadModel = {
  id: string;
  props: EventProps;
  createdAt: Date;
  updatedAt: Date;
  capacity: EventCapacityReadModel;
  lots: EventLotReadModel[];
  formFields: EventFormFieldReadModel[];
  activities: EventActivityReadModel[];
};
export type ListPublicEventsParams = { query?: string; modality?: string; limit: number };
export type GetPublicEventParams = { slug: string; at: Date };
export type ListManagedEventsParams = { userId: string; canViewAll: boolean; query?: string };
export type FindEventByIdParams = { id: string };
export type GetManagedEventParams = { id: string; userId: string; canViewAll: boolean };
export type CreateEventRecordParams = { event: Event; lots: NewEventLot[]; fields: NewEventField[]; activities: NewEventActivity[] };
export type NewEventLot = { id: string; name: string; priceCents: number; maxQuantity: number; startAt: Date; endAt: Date; active: boolean; sortOrder: number };
export type NewEventField = { id: string; label: string; description: string | null; type: FormFieldType; required: boolean; options: string[]; displayOrder: number };
export type NewEventActivity = { id: string; title: string; description: string; speakerName: string; speakerBio: string | null; room: string | null; startAt: Date; endAt: Date };
export type UpdateEventDetailsParams = {
  eventId: string;
  actorId: string;
  canViewAll: boolean;
  props: EventProps;
  updatedAt: Date;
  lots?: NewEventLot[];
  fields?: NewEventField[];
  activities?: NewEventActivity[];
};
export type TransitionEventParams = { eventId: string; actorId: string; canViewAll: boolean; nextStatus: EventProps["status"]; at: Date; justification?: string };
export type EventRegistrationCountParams = { eventId: string };

export interface IEventRepository {
  listPublic(params: ListPublicEventsParams): Promise<EventReadModel[]>;
  getPublicBySlug(params: GetPublicEventParams): Promise<EventReadModel | null>;
  listManaged(params: ListManagedEventsParams): Promise<EventReadModel[]>;
  findById(params: FindEventByIdParams): Promise<Event | null>;
  getManagedById(params: GetManagedEventParams): Promise<EventReadModel | null>;
  create(params: CreateEventRecordParams): Promise<EventReadModel>;
  update(params: UpdateEventDetailsParams): Promise<EventReadModel | null>;
  transition(params: TransitionEventParams): Promise<EventReadModel | null>;
}

export abstract class EventRepository implements IEventRepository {
  abstract listPublic(params: ListPublicEventsParams): Promise<EventReadModel[]>;
  abstract getPublicBySlug(params: GetPublicEventParams): Promise<EventReadModel | null>;
  abstract listManaged(params: ListManagedEventsParams): Promise<EventReadModel[]>;
  abstract findById(params: FindEventByIdParams): Promise<Event | null>;
  abstract getManagedById(params: GetManagedEventParams): Promise<EventReadModel | null>;
  abstract create(params: CreateEventRecordParams): Promise<EventReadModel>;
  abstract update(params: UpdateEventDetailsParams): Promise<EventReadModel | null>;
  abstract transition(params: TransitionEventParams): Promise<EventReadModel | null>;
}
