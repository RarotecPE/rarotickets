import type { EventModality, EventStatus } from '../../domain/value-objects/event-status.vo';
import type { EventType } from '../../domain/value-objects/event-price.vo';

export type EventDto = {
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
