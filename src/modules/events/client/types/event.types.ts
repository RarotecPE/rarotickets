import type { EventModality, EventStatus } from '../../domain/value-objects/event-status.vo';
import type { EventType } from '../../domain/value-objects/event-price.vo';

export type EventView = {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  eventType: EventType;
  priceCents: number;
  startAt: string;
  endAt: string;
  capacity: number | null;
  status: EventStatus;
  modality: EventModality;
  location: string;
  registrationsCount: number;
  confirmedRegistrationsCount: number;
  revenueCents: number;
  createdById: string;
  createdAt: string;
};

export type EventListResponse = { data: { events: EventView[] } };

export type CreateEventPayload = {
  title: string;
  shortDescription: string;
  description: string;
  eventType: EventType;
  priceCents: number;
  startAt: string;
  endAt: string;
  capacity: number | null;
  modality: EventModality;
  location: string;
};

export type CreateEventResponse = { data: { event: EventView } };
export type UpdateEventStatusResponse = { data: { event: EventView } };
