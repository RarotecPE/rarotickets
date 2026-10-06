import { Mapper } from '../../../../@core/application/mapper.base';
import type { Event } from '../../domain/entities/event.entity';
import type { EventDto } from '../types/event.dto';

export type MapEventParams = { event: Event };

export class EventMapper extends Mapper<MapEventParams, EventDto> {
  map(params: MapEventParams): EventDto {
    const { event } = params;
    return {
      id: event.id.toString(),
      title: event.title.value,
      shortDescription: event.shortDescription,
      description: event.description,
      eventType: event.eventType,
      priceCents: event.priceCents,
      startAt: event.startAt,
      endAt: event.endAt,
      capacity: event.capacity,
      status: event.status,
      modality: event.modality,
      location: event.location,
      registrationsCount: event.registrationsCount,
      confirmedRegistrationsCount: event.confirmedRegistrationsCount,
      revenueCents: event.revenueCents,
      createdById: event.createdById,
      createdAt: event.createdAt.toISOString(),
    };
  }
}
