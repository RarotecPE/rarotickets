import { Result } from '@core/domain/result';
import { normalizeSpaces } from '@core/domain/text.util';
import { ValueObject } from '@core/domain/value-object.base';

export type EventTitleProps = { value: string };

export class EventTitle extends ValueObject<EventTitleProps> {
  private constructor(props: EventTitleProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): Result<EventTitle> {
    const normalized = normalizeSpaces(value ?? '');
    if (normalized.length < 5) return Result.fail(new Error('Título do evento deve ter ao menos 5 caracteres'));
    if (normalized.length > 150) return Result.fail(new Error('Título do evento deve ter no máximo 150 caracteres'));
    return Result.ok(new EventTitle({ value: normalized }));
  }

  public static reconstitute(value: string): EventTitle {
    return new EventTitle({ value });
  }
}
