import { normalizeEmail } from '@core/domain/text.util';
import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type ParticipantEmailProps = { value: string };

export class ParticipantEmail extends ValueObject<ParticipantEmailProps> {
  private constructor(props: ParticipantEmailProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): Result<ParticipantEmail> {
    const normalized = normalizeEmail(value ?? '');
    if (!normalized) return Result.fail(new Error('E-mail é obrigatório'));
    if (normalized.length > 255) return Result.fail(new Error('E-mail deve ter no máximo 255 caracteres'));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) return Result.fail(new Error('Formato de e-mail inválido'));
    return Result.ok(new ParticipantEmail({ value: normalized }));
  }

  public static reconstitute(value: string): ParticipantEmail {
    return new ParticipantEmail({ value });
  }
}
