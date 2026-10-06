import { AggregateRoot } from '../../../../@core/domain/aggregate-root.base';
import type { EntityConstructorParams } from '../../../../@core/domain/entity.base';
import { Result } from '../../../../@core/domain/result';
import { InvalidEventStatusError } from '../errors/invalid-event-status.error';
import { InvalidEventModalityError } from '../errors/invalid-event-modality.error';
import { InvalidEventLocationError } from '../errors/invalid-event-location.error';
import { EventCapacity } from '../value-objects/event-capacity.vo';
import { EventPeriod } from '../value-objects/event-period.vo';
import { EventPrice, type EventType } from '../value-objects/event-price.vo';
import { isEventStatus, type EventModality, type EventStatus } from '../value-objects/event-status.vo';
import { EventTitle } from '../value-objects/event-title.vo';

export type EventProps = {
  title: EventTitle;
  shortDescription: string;
  description: string;
  price: EventPrice;
  period: EventPeriod;
  capacity: EventCapacity;
  status: EventStatus;
  modality: EventModality;
  location: string;
  registrationsCount: number;
  confirmedRegistrationsCount: number;
  revenueCents: number;
  createdById: string;
};

export type EventConstructorParams = EntityConstructorParams<EventProps>;

export type CreateEventParams = {
  title: string;
  shortDescription: string;
  description: string;
  eventType: EventType;
  priceCents: number;
  startAt: string;
  endAt: string;
  capacity: number | null;
  status?: string;
  modality: EventModalityInput;
  location: string;
  createdById: string;
};

export type ReconstituteEventParams = EventConstructorParams;
export type ChangeEventStatusParams = { status: string };
type EventModalityInput = string;
type IsValidEventLocationParams = { modality: EventModalityInput; location: string };

export class Event extends AggregateRoot<EventProps> {
  private constructor(params: EventConstructorParams) {
    super(params);
  }

  get title(): EventTitle { return this.props.title; }
  get shortDescription(): string { return this.props.shortDescription; }
  get description(): string { return this.props.description; }
  get eventType(): EventType { return this.props.price.eventType; }
  get priceCents(): number { return this.props.price.priceCents; }
  get startAt(): string { return this.props.period.startAt; }
  get endAt(): string { return this.props.period.endAt; }
  get capacity(): number | null { return this.props.capacity.value; }
  get status(): EventStatus { return this.props.status; }
  get modality(): EventModality { return this.props.modality; }
  get location(): string { return this.props.location; }
  get registrationsCount(): number { return this.props.registrationsCount; }
  get confirmedRegistrationsCount(): number { return this.props.confirmedRegistrationsCount; }
  get revenueCents(): number { return this.props.revenueCents; }
  get createdById(): string { return this.props.createdById; }

  static create(params: CreateEventParams): Result<Event> {
    const titleResult = EventTitle.create(params.title);
    if (titleResult.isFailure) return Result.fail(titleResult.error);
    const periodResult = EventPeriod.create({ startAt: params.startAt, endAt: params.endAt });
    if (periodResult.isFailure) return Result.fail(periodResult.error);
    const capacityResult = EventCapacity.create(params.capacity);
    if (capacityResult.isFailure) return Result.fail(capacityResult.error);
    const priceResult = EventPrice.create({ eventType: params.eventType, priceCents: params.priceCents });
    if (priceResult.isFailure) return Result.fail(priceResult.error);
    const status = params.status ?? 'RASCUNHO';
    if (!isEventStatus(status)) return Result.fail(new InvalidEventStatusError());
    if (!this.isValidModality(params.modality)) return Result.fail(new InvalidEventModalityError());
    if (!this.isValidLocation({ modality: params.modality, location: params.location })) return Result.fail(new InvalidEventLocationError());

    return Result.ok(new Event({
      props: {
        title: titleResult.value,
        shortDescription: params.shortDescription.trim(),
        description: params.description.trim(),
        price: priceResult.value,
        period: periodResult.value,
        capacity: capacityResult.value,
        status,
        modality: params.modality,
        location: params.location.trim(),
        registrationsCount: 0,
        confirmedRegistrationsCount: 0,
        revenueCents: 0,
        createdById: params.createdById,
      },
    }));
  }

  static reconstitute(params: ReconstituteEventParams): Event {
    return new Event(params);
  }

  changeStatus(params: ChangeEventStatusParams): Result<void> {
    if (!isEventStatus(params.status)) return Result.fail(new InvalidEventStatusError());
    if (this.props.status === 'CANCELADO' && params.status !== 'CANCELADO') {
      return Result.fail(new InvalidEventStatusError());
    }
    this.props.status = params.status;
    this.touch();
    return Result.ok();
  }

  private static isValidModality(modality: EventModalityInput): modality is EventModality {
    return modality === 'PRESENCIAL' || modality === 'ONLINE';
  }

  private static isValidLocation(params: IsValidEventLocationParams): boolean {
    if (params.modality === 'PRESENCIAL') return params.location.trim().length > 0;
    return /^https:\/\/[a-z0-9.-]+(?::\d{1,5})?(?:[/?#][^\s]*)?$/i.test(params.location.trim());
  }
}
