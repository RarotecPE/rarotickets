import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type EventCapacityProps = { value: number };

export const MAX_EVENT_CAPACITY = 100_000;

export class EventCapacity extends ValueObject<EventCapacityProps> {
  private constructor(props: EventCapacityProps) {
    super(props);
  }

  get value(): number {
    return this.props.value;
  }

  public static create(value: number): Result<EventCapacity> {
    if (!Number.isInteger(value)) return Result.fail(new Error('Capacidade deve ser um número inteiro'));
    if (value <= 0) return Result.fail(new Error('Capacidade do evento deve ser maior que zero'));
    if (value > MAX_EVENT_CAPACITY) {
      return Result.fail(new Error(`Capacidade do evento não pode exceder ${MAX_EVENT_CAPACITY}`));
    }
    return Result.ok(new EventCapacity({ value }));
  }

  public static reconstitute(value: number): EventCapacity {
    return new EventCapacity({ value });
  }
}
