import { onlyDigits } from '@core/domain/validators/document.validator';
import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type PhoneProps = { value: string };

export class Phone extends ValueObject<PhoneProps> {
  private constructor(props: PhoneProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): Result<Phone> {
    const digits = onlyDigits(value ?? '');
    if (!digits) return Result.fail(new Error('Telefone é obrigatório'));
    if (digits.length < 10 || digits.length > 11) return Result.fail(new Error('Telefone deve ter DDD + 8 ou 9 dígitos'));
    if (Number(digits.slice(0, 2)) < 11) return Result.fail(new Error('DDD do telefone inválido'));
    return Result.ok(new Phone({ value: digits }));
  }

  public static reconstitute(value: string): Phone {
    return new Phone({ value });
  }

  public get formatted(): string {
    const digits = this.props.value;
    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);
    return rest.length === 9
      ? `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`
      : `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
}
