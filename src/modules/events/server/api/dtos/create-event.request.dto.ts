import type { EventType } from '../../../domain/value-objects/event-price.vo';

export type CreateEventRequestDto = {
  title: string;
  shortDescription: string;
  description: string;
  eventType: EventType;
  priceCents: number;
  startAt: string;
  endAt: string;
  capacity: number | null;
  modality: 'PRESENCIAL' | 'ONLINE';
  location: string;
};

export type CreateEventControllerRequest = {
  body: CreateEventRequestDto;
  createdById: string;
};
