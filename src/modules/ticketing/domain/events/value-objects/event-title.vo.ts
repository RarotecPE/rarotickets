import { ValueObject } from "@/@core/domain/value-object.base";
import { Result } from "@/@core/domain/result";
import { DomainError } from "@/@core/domain/errors/domain-error.base";

export type EventTitleValue = string;
export type EventTitleProps = { value: EventTitleValue };

export class InvalidEventTitleError extends DomainError {
  constructor() {
    super({ code: "INVALID_EVENT_TITLE", message: "O título deve conter entre 5 e 140 caracteres." });
  }
}

export class EventTitle extends ValueObject<EventTitleProps> {
  private constructor(props: EventTitleProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  static create(value: EventTitleValue): Result<EventTitle, InvalidEventTitleError> {
    const normalized = value.trim().replace(/\s+/g, " ");
    if (normalized.length < 5 || normalized.length > 140) return Result.fail(new InvalidEventTitleError());
    return Result.ok(new EventTitle({ value: normalized }));
  }
}
