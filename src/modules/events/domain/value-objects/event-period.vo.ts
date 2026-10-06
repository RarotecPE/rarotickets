import { ValueObject } from '../../../../@core/domain/value-object.base';
import { Result } from '../../../../@core/domain/result';
import { InvalidEventPeriodError } from '../errors/invalid-event-period.error';

export type EventPeriodProps = { startAt: string; endAt: string };
export type CreateEventPeriodParams = EventPeriodProps;

export class EventPeriod extends ValueObject<EventPeriodProps> {
  private constructor(props: EventPeriodProps) {
    super(props);
  }

  get startAt(): string {
    return this.props.startAt;
  }

  get endAt(): string {
    return this.props.endAt;
  }

  static create(params: CreateEventPeriodParams): Result<EventPeriod, InvalidEventPeriodError> {
    const startAt = new Date(params.startAt);
    const endAt = new Date(params.endAt);
    if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt) {
      return Result.fail(new InvalidEventPeriodError());
    }
    return Result.ok(new EventPeriod({ startAt: startAt.toISOString(), endAt: endAt.toISOString() }));
  }

  static reconstitute(params: CreateEventPeriodParams): EventPeriod {
    return new EventPeriod(params);
  }
}
