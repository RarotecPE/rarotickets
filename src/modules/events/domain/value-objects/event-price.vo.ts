import { ValueObject } from '../../../../@core/domain/value-object.base';
import { Result } from '../../../../@core/domain/result';
import { InvalidEventPriceError } from '../errors/invalid-event-price.error';

export type EventType = 'GRATUITO' | 'PAGO';
export type EventPriceProps = { eventType: EventType; priceCents: number };
export type CreateEventPriceParams = EventPriceProps;

export class EventPrice extends ValueObject<EventPriceProps> {
  private constructor(props: EventPriceProps) {
    super(props);
  }

  get eventType(): EventType {
    return this.props.eventType;
  }

  get priceCents(): number {
    return this.props.priceCents;
  }

  static create(params: CreateEventPriceParams): Result<EventPrice, InvalidEventPriceError> {
    const validType = params.eventType === 'GRATUITO' || params.eventType === 'PAGO';
    const validPrice = Number.isSafeInteger(params.priceCents) && params.priceCents >= 0;
    const validPair = params.eventType === 'PAGO' ? params.priceCents > 0 : params.priceCents === 0;
    if (!validType || !validPrice || !validPair) return Result.fail(new InvalidEventPriceError());
    return Result.ok(new EventPrice(params));
  }

  static reconstitute(params: CreateEventPriceParams): EventPrice {
    return new EventPrice(params);
  }
}
