import { ValueObject } from '../../../../@core/domain/value-object.base';
import { Result } from '../../../../@core/domain/result';
import { InvalidEventTitleError } from '../errors/invalid-event-title.error';

export type EventTitleValue = string;
export type EventTitleProps = { value: EventTitleValue };

export class EventTitle extends ValueObject<EventTitleProps> {
  private constructor(props: EventTitleProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  static create(value: EventTitleValue): Result<EventTitle, InvalidEventTitleError> {
    const normalizedValue = value.trim().replace(/\s+/g, ' ');
    if (normalizedValue.length < 3 || normalizedValue.length > 120) {
      return Result.fail(new InvalidEventTitleError());
    }
    return Result.ok(new EventTitle({ value: normalizedValue }));
  }

  static reconstitute(value: EventTitleValue): EventTitle {
    return new EventTitle({ value });
  }
}
