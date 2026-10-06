import { ValueObject } from '../../../../@core/domain/value-object.base';
import { Result } from '../../../../@core/domain/result';
import { InvalidEventCapacityError } from '../errors/invalid-event-capacity.error';

export type EventCapacityValue = number | null;
export type EventCapacityProps = { value: EventCapacityValue };

export class EventCapacity extends ValueObject<EventCapacityProps> {
  private constructor(props: EventCapacityProps) {
    super(props);
  }

  get value(): EventCapacityValue {
    return this.props.value;
  }

  static create(value: EventCapacityValue): Result<EventCapacity, InvalidEventCapacityError> {
    if (value !== null && (!Number.isSafeInteger(value) || value < 1)) {
      return Result.fail(new InvalidEventCapacityError());
    }
    return Result.ok(new EventCapacity({ value }));
  }

  static reconstitute(value: EventCapacityValue): EventCapacity {
    return new EventCapacity({ value });
  }
}
