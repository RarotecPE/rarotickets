import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type EventDescriptionProps = { value: string };

export class EventDescription extends ValueObject<EventDescriptionProps> {
  private constructor(props: EventDescriptionProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): Result<EventDescription> {
    const normalized = (value ?? '').trim();
    if (normalized.length < 20) return Result.fail(new Error('Descrição do evento deve ter ao menos 20 caracteres'));
    if (normalized.length > 8000) return Result.fail(new Error('Descrição do evento deve ter no máximo 8000 caracteres'));
    return Result.ok(new EventDescription({ value: normalized }));
  }

  public static reconstitute(value: string): EventDescription {
    return new EventDescription({ value });
  }
}
