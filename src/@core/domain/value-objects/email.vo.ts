import { ValueObject } from '../value-object.base.ts';
import { Result } from '../result.ts';
import { ValidationError } from '../errors/domain-errors.ts';

export type EmailValue = string;
export type EmailProps = { value: EmailValue };

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  public get value(): EmailValue {
    return this.props.value;
  }

  public static create(value: EmailValue): Result<Email, ValidationError> {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return Result.fail(new ValidationError({ code: 'EMAIL_REQUIRED', message: 'O e-mail é obrigatório.' }));
    }
    if (normalized.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return Result.fail(new ValidationError({ code: 'EMAIL_INVALID', message: 'O e-mail informado é inválido.' }));
    }
    return Result.ok(new Email({ value: normalized }));
  }

  public static reconstitute(value: EmailValue): Email {
    return new Email({ value });
  }
}
