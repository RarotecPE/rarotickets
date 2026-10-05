import { formatCnpj, isValidCnpj, onlyDigits } from '@core/domain/validators/document.validator';
import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type CnpjProps = { value: string };

export class Cnpj extends ValueObject<CnpjProps> {
  private constructor(props: CnpjProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  get formatted(): string {
    return formatCnpj(this.props.value);
  }

  public static create(value: string): Result<Cnpj> {
    const digits = onlyDigits(value ?? '');
    if (!digits) return Result.fail(new Error('CNPJ é obrigatório'));
    if (digits.length !== 14) return Result.fail(new Error('CNPJ deve conter 14 dígitos'));
    if (!isValidCnpj(digits)) return Result.fail(new Error('CNPJ inválido'));
    return Result.ok(new Cnpj({ value: digits }));
  }

  public static reconstitute(value: string): Cnpj {
    return new Cnpj({ value });
  }
}
