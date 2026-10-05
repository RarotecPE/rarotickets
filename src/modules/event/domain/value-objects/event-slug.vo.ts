import { Result } from '@core/domain/result';
import { toSlug } from '@core/domain/text.util';
import { ValueObject } from '@core/domain/value-object.base';

export type EventSlugProps = { value: string };

export class EventSlug extends ValueObject<EventSlugProps> {
  private constructor(props: EventSlugProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): Result<EventSlug> {
    const normalized = toSlug(value ?? '');
    if (normalized.length < 5) return Result.fail(new Error('Slug do evento deve ter ao menos 5 caracteres'));
    if (normalized.length > 160) return Result.fail(new Error('Slug do evento deve ter no máximo 160 caracteres'));
    return Result.ok(new EventSlug({ value: normalized }));
  }

  /** Gera o slug a partir do título, acrescentando sufixo quando informado. */
  public static fromTitle(title: string, suffix?: string): EventSlug {
    const base = toSlug(title).slice(0, 150) || 'evento';
    return new EventSlug({ value: suffix ? `${base}-${suffix}` : base });
  }

  public static reconstitute(value: string): EventSlug {
    return new EventSlug({ value });
  }
}
