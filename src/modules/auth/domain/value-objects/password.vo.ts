import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type PasswordProps = { value: string };
export type PasswordHash = string;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;

export class Password extends ValueObject<PasswordProps> {
  private constructor(props: PasswordProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): Result<Password> {
    const plain = value ?? '';
    if (plain.length < MIN_PASSWORD_LENGTH) {
      return Result.fail(new Error(`Senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres`));
    }
    if (plain.length > MAX_PASSWORD_LENGTH) {
      return Result.fail(new Error(`Senha deve ter no máximo ${MAX_PASSWORD_LENGTH} caracteres`));
    }
    if (!/[A-Za-zÀ-ÿ]/.test(plain) || !/\d/.test(plain)) {
      return Result.fail(new Error('Senha deve conter letras e números'));
    }
    return Result.ok(new Password({ value: plain }));
  }
}
