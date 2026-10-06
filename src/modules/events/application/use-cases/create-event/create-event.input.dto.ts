import type { EventType } from '../../../domain/value-objects/event-price.vo';

export type CreateEventInputDto = {
  title: string;
  shortDescription: string;
  description: string;
  eventType: EventType;
  priceCents: number;
  startAt: string;
  endAt: string;
  capacity: number | null;
  modality: string;
  location: string;
  createdById: string;
};
