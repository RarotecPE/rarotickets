import { ValueObject } from '../value-object.base.ts';
import { Result } from '../result.ts';
import { ValidationError } from '../errors/domain-errors.ts';

export type CnpjValue = string;
export type CnpjProps = { value: CnpjValue };

export class Cnpj extends ValueObject<CnpjProps> {
  private constructor(props: CnpjProps) {
    super(props);
  }

  public get value(): CnpjValue {
    return this.props.value;
  }

  public static create(value: CnpjValue): Result<Cnpj, ValidationError> {
    const digits = value.replace(/\D/g, '');
    if (!this.isValid(digits)) {
      return Result.fail(new ValidationError({ code: 'CNPJ_INVALID', message: 'O CNPJ informado é inválido.' }));
    }
    return Result.ok(new Cnpj({ value: digits }));
  }

  public static reconstitute(value: CnpjValue): Cnpj {
    return new Cnpj({ value: value.replace(/\D/g, '') });
  }

  private static isValid(value: string): boolean {
    if (value.length !== 14 || /^([0-9])\1{13}$/.test(value)) return false;
    const digits = value.split('').map(Number);
    const firstCheckDigit = this.calculateDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const secondCheckDigit = this.calculateDigit(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return digits[12] === firstCheckDigit && digits[13] === secondCheckDigit;
  }

  private static calculateDigit(digits: number[], weights: number[]): number {
    const sum = digits.reduce((total, digit, index) => total + digit * (weights[index] ?? 0), 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  }
}
