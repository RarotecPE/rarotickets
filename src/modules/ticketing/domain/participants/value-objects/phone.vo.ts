import { ValueObject } from "@/@core/domain/value-object.base";
import { Result } from "@/@core/domain/result";
import { DomainError } from "@/@core/domain/errors/domain-error.base";

export type PhoneValue = string;
export type PhoneProps = { value: PhoneValue };
export type InvalidPhoneErrorParams = { value: PhoneValue };

export class InvalidPhoneError extends DomainError {
  constructor(params: InvalidPhoneErrorParams) {
    super({ code: "INVALID_PHONE", message: `Telefone inválido: ${params.value}` });
  }
}

export class Phone extends ValueObject<PhoneProps> {
  private constructor(props: PhoneProps) {
    super(props);
  }

  get value(): string { return this.props.value; }
  get digits(): string { return this.props.value.replace(/\D/g, ""); }

  static create(value: PhoneValue): Result<Phone, InvalidPhoneError> {
    const digits = value.replace(/\D/g, "");
    if (!/^\d{10,11}$/.test(digits)) return Result.fail(new InvalidPhoneError({ value }));
    return Result.ok(new Phone({ value: digits }));
  }

  static reconstitute(value: PhoneValue): Phone {
    return new Phone({ value: value.replace(/\D/g, "") });
  }
}
