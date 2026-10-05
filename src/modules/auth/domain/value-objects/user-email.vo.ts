import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';
import { normalizeEmail } from '@core/domain/text.util';

export type UserEmailProps = { value: string };

export class UserEmail extends ValueObject<UserEmailProps> {
  private constructor(props: UserEmailProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): Result<UserEmail> {
    const normalized = normalizeEmail(value ?? '');
    if (!normalized) return Result.fail(new Error('E-mail é obrigatório'));
    if (normalized.length > 255) return Result.fail(new Error('E-mail deve ter no máximo 255 caracteres'));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) return Result.fail(new Error('Formato de e-mail inválido'));
    return Result.ok(new UserEmail({ value: normalized }));
  }

  public static reconstitute(value: string): UserEmail {
    return new UserEmail({ value });
  }
}
