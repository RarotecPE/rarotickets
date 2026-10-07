import { ValueObject } from "@/@core/domain/value-object.base";
import { Result } from "@/@core/domain/result";
import { DomainError } from "@/@core/domain/errors/domain-error.base";

export type EmailValue = string;
export type EmailProps = { value: EmailValue };
export type InvalidEmailErrorParams = { value: EmailValue };

export class InvalidEmailError extends DomainError {
  constructor(params: InvalidEmailErrorParams) {
    super({ code: "INVALID_EMAIL", message: `E-mail inválido: ${params.value}` });
  }
}

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  static create(value: EmailValue): Result<Email, InvalidEmailError> {
    const normalized = value.trim().toLowerCase();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) && normalized.length <= 254;
    if (!isValid) return Result.fail(new InvalidEmailError({ value }));
    return Result.ok(new Email({ value: normalized }));
  }

  static reconstitute(value: EmailValue): Email {
    return new Email({ value });
  }
}
