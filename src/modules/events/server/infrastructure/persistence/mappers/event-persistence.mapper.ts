import { PersistenceMapper } from '../../../../../../@core/application/persistence-mapper.base';
import { Identifier } from '../../../../../../@core/domain/identifier';
import { Event } from '../../../../domain/entities/event.entity';
import { EventCapacity } from '../../../../domain/value-objects/event-capacity.vo';
import { EventPeriod } from '../../../../domain/value-objects/event-period.vo';
import { EventPrice } from '../../../../domain/value-objects/event-price.vo';
import { EventTitle } from '../../../../domain/value-objects/event-title.vo';
import type { EventModel } from '../models/event.model';

export type EventToDomainParams = { record: EventModel };
export type EventToPersistenceParams = { entity: Event };

export class EventPersistenceMapper extends PersistenceMapper<Event, EventModel, EventModel> {
  toDomain(params: EventToDomainParams): Event {
    const { record } = params;
    return Event.reconstitute({
      id: Identifier.fromExisting(record.id),
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt ?? record.createdAt),
      props: {
        title: EventTitle.reconstitute(record.title),
        shortDescription: record.shortDescription,
        description: record.description,
        price: EventPrice.reconstitute({ eventType: record.eventType, priceCents: record.priceCents }),
        period: EventPeriod.reconstitute({ startAt: record.startAt, endAt: record.endAt }),
        capacity: EventCapacity.reconstitute(record.capacity),
        status: record.status,
        modality: record.modality,
        location: record.location,
        registrationsCount: record.registrationsCount,
        confirmedRegistrationsCount: record.confirmedRegistrationsCount,
        revenueCents: record.revenueCents,
        createdById: record.createdById,
      },
    });
  }

  toPersistence(params: EventToPersistenceParams): EventModel {
    const { entity } = params;
    return {
      id: entity.id.toString(),
      title: entity.title.value,
      shortDescription: entity.shortDescription,
      description: entity.description,
      eventType: entity.eventType,
      priceCents: entity.priceCents,
      startAt: entity.startAt,
      endAt: entity.endAt,
      capacity: entity.capacity,
      status: entity.status,
      modality: entity.modality,
      location: entity.location,
      registrationsCount: entity.registrationsCount,
      confirmedRegistrationsCount: entity.confirmedRegistrationsCount,
      revenueCents: entity.revenueCents,
      createdById: entity.createdById,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
