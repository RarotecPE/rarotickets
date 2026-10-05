import { formatCpf, isValidCpf, onlyDigits } from '@core/domain/validators/document.validator';
import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type CpfProps = { value: string };

/** CPF normalizado (somente dígitos) com validação de dígitos verificadores. */
export class Cpf extends ValueObject<CpfProps> {
  private constructor(props: CpfProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  get formatted(): string {
    return formatCpf(this.props.value);
  }

  public static create(value: string): Result<Cpf> {
    const digits = onlyDigits(value ?? '');
    if (!digits) return Result.fail(new Error('CPF é obrigatório'));
    if (digits.length !== 11) return Result.fail(new Error('CPF deve conter 11 dígitos'));
    if (!isValidCpf(digits)) return Result.fail(new Error('CPF inválido'));
    return Result.ok(new Cpf({ value: digits }));
  }

  public static reconstitute(value: string): Cpf {
    return new Cpf({ value });
  }
}
