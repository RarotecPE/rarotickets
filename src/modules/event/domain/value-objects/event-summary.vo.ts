import { Result } from '@core/domain/result';
import { normalizeSpaces } from '@core/domain/text.util';
import { ValueObject } from '@core/domain/value-object.base';

export type EventSummaryProps = { value: string };

export class EventSummary extends ValueObject<EventSummaryProps> {
  private constructor(props: EventSummaryProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): Result<EventSummary> {
    const normalized = normalizeSpaces(value ?? '');
    if (normalized.length < 10) return Result.fail(new Error('Descrição resumida deve ter ao menos 10 caracteres'));
    if (normalized.length > 300) return Result.fail(new Error('Descrição resumida deve ter no máximo 300 caracteres'));
    return Result.ok(new EventSummary({ value: normalized }));
  }

  public static reconstitute(value: string): EventSummary {
    return new EventSummary({ value });
  }
}
