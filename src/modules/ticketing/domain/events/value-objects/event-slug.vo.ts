import { ValueObject } from "@/@core/domain/value-object.base";
import { Result } from "@/@core/domain/result";
import { DomainError } from "@/@core/domain/errors/domain-error.base";

export type EventSlugValue = string;
export type EventSlugProps = { value: EventSlugValue };
export type InvalidEventSlugErrorParams = { value: EventSlugValue };

export class InvalidEventSlugError extends DomainError {
  constructor(params: InvalidEventSlugErrorParams) {
    super({ code: "INVALID_EVENT_SLUG", message: `Identificador público inválido: ${params.value}` });
  }
}

export class EventSlug extends ValueObject<EventSlugProps> {
  private constructor(props: EventSlugProps) { super(props); }
  get value(): string { return this.props.value; }

  static create(value: EventSlugValue): Result<EventSlug, InvalidEventSlugError> {
    const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (normalized.length < 3 || normalized.length > 180) return Result.fail(new InvalidEventSlugError({ value }));
    return Result.ok(new EventSlug({ value: normalized }));
  }
}
