import { ValueObject } from "@/@core/domain/value-object.base";
import { Result } from "@/@core/domain/result";
import { DomainError } from "@/@core/domain/errors/domain-error.base";

export type CpfValue = string;
export type CpfProps = { value: CpfValue };
export type InvalidCpfErrorParams = { value: CpfValue };

export class InvalidCpfError extends DomainError {
  constructor(params: InvalidCpfErrorParams) {
    super({ code: "INVALID_CPF", message: `CPF inválido: ${params.value}` });
  }
}

export class Cpf extends ValueObject<CpfProps> {
  private constructor(props: CpfProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  get digits(): string {
    return this.props.value.replace(/\D/g, "");
  }

  static create(value: CpfValue): Result<Cpf, InvalidCpfError> {
    const digits = value.replace(/\D/g, "");
    if (!Cpf.isValidDigits(digits)) return Result.fail(new InvalidCpfError({ value }));
    return Result.ok(new Cpf({ value: digits }));
  }

  static reconstitute(value: CpfValue): Cpf {
    return new Cpf({ value: value.replace(/\D/g, "") });
  }

  private static isValidDigits(digits: string): boolean {
    if (!/^\d{11}$/.test(digits) || /^([0-9])\1{10}$/.test(digits)) return false;
    const numbers = Array.from(digits, Number);
    const first = Cpf.calculateCheckDigit(numbers.slice(0, 9), 10);
    const second = Cpf.calculateCheckDigit(numbers.slice(0, 9).concat(first), 11);
    return numbers[9] === first && numbers[10] === second;
  }

  private static calculateCheckDigit(numbers: number[], weight: number): number {
    const sum = numbers.reduce((total, digit) => total + digit * weight--, 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  }
}
