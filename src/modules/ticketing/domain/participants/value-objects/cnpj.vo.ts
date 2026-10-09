import { ValueObject } from "@/@core/domain/value-object.base";
import { Result } from "@/@core/domain/result";
import { DomainError } from "@/@core/domain/errors/domain-error.base";

export type CnpjValue = string;
export type CnpjProps = { value: CnpjValue };
export type InvalidCnpjErrorParams = { value: CnpjValue };
type CalculateCheckDigitParams = { numbers: number[]; weights: number[] };

export class InvalidCnpjError extends DomainError {
  constructor(params: InvalidCnpjErrorParams) {
    super({ code: "INVALID_CNPJ", message: `CNPJ inválido: ${params.value}` });
  }
}

export class Cnpj extends ValueObject<CnpjProps> {
  private constructor(props: CnpjProps) {
    super(props);
  }

  get value(): string { return this.props.value; }
  get digits(): string { return this.props.value.replace(/\D/g, ""); }

  static create(value: CnpjValue): Result<Cnpj, InvalidCnpjError> {
    const digits = value.replace(/\D/g, "");
    if (!Cnpj.isValidDigits(digits)) return Result.fail(new InvalidCnpjError({ value }));
    return Result.ok(new Cnpj({ value: digits }));
  }

  static reconstitute(value: CnpjValue): Cnpj {
    return new Cnpj({ value: value.replace(/\D/g, "") });
  }

  private static isValidDigits(digits: string): boolean {
    if (!/^\d{14}$/.test(digits) || /^([0-9])\1{13}$/.test(digits)) return false;
    const numbers = Array.from(digits, Number);
    const first = Cnpj.calculateCheckDigit({ numbers: numbers.slice(0, 12), weights: [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] });
    const second = Cnpj.calculateCheckDigit({ numbers: numbers.slice(0, 12).concat(first), weights: [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] });
    return numbers[12] === first && numbers[13] === second;
  }

  private static calculateCheckDigit(params: CalculateCheckDigitParams): number {
    const total = params.numbers.reduce((sum, digit, index) => sum + digit * params.weights[index], 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  }
}
