import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type EventTypeValue = 'GRATUITO' | 'PAGO';
export type EventTypeProps = { value: EventTypeValue };

export class EventType extends ValueObject<EventTypeProps> {
  private constructor(props: EventTypeProps) {
    super(props);
  }

  get value(): EventTypeValue {
    return this.props.value;
  }

  public static create(value: string): Result<EventType> {
    const normalized = (value ?? '').toUpperCase() as EventTypeValue;
    if (normalized !== 'GRATUITO' && normalized !== 'PAGO') {
      return Result.fail(new Error('Tipo do evento deve ser GRATUITO ou PAGO'));
    }
    return Result.ok(new EventType({ value: normalized }));
  }

  public static reconstitute(value: EventTypeValue): EventType {
    return new EventType({ value });
  }

  public isFree(): boolean {
    return this.props.value === 'GRATUITO';
  }

  public isPaid(): boolean {
    return this.props.value === 'PAGO';
  }
}
