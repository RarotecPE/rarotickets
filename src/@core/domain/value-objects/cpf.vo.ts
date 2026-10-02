import { ValueObject } from '../value-object.base.ts';
import { Result } from '../result.ts';
import { ValidationError } from '../errors/domain-errors.ts';

export type CpfValue = string;
export type CpfProps = { value: CpfValue };

export class Cpf extends ValueObject<CpfProps> {
  private constructor(props: CpfProps) {
    super(props);
  }

  public get value(): CpfValue {
    return this.props.value;
  }

  public static create(value: CpfValue): Result<Cpf, ValidationError> {
    const digits = value.replace(/\D/g, '');
    if (!this.isValid(digits)) {
      return Result.fail(new ValidationError({ code: 'CPF_INVALID', message: 'O CPF informado é inválido.' }));
    }
    return Result.ok(new Cpf({ value: digits }));
  }

  public static reconstitute(value: CpfValue): Cpf {
    return new Cpf({ value: value.replace(/\D/g, '') });
  }

  private static isValid(value: string): boolean {
    if (value.length !== 11 || /^([0-9])\1{10}$/.test(value)) return false;
    const digits = value.split('').map(Number);
    const firstCheckDigit = this.calculateDigit(digits.slice(0, 9), 10);
    const secondCheckDigit = this.calculateDigit(digits.slice(0, 10), 11);
    return digits[9] === firstCheckDigit && digits[10] === secondCheckDigit;
  }

  private static calculateDigit(digits: number[], initialWeight: number): number {
    const sum = digits.reduce((total, digit, index) => total + digit * (initialWeight - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  }
}
