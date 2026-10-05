import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';
import { normalizeSpaces } from '@core/domain/text.util';

export type UserNameProps = { value: string };

export class UserName extends ValueObject<UserNameProps> {
  private constructor(props: UserNameProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): Result<UserName> {
    const normalized = normalizeSpaces(value ?? '');
    if (normalized.length < 3) return Result.fail(new Error('Nome do usuário deve ter ao menos 3 caracteres'));
    if (normalized.length > 120) return Result.fail(new Error('Nome do usuário deve ter no máximo 120 caracteres'));
    if (!/^[\p{L}\p{M}'\-. ]+$/u.test(normalized)) return Result.fail(new Error('Nome do usuário contém caracteres inválidos'));
    return Result.ok(new UserName({ value: normalized }));
  }

  public static reconstitute(value: string): UserName {
    return new UserName({ value });
  }
}
