import { ValueObject } from '../../../../@core/domain/value-object.base';
import { Result } from '../../../../@core/domain/result';
import { InvalidParticipantCpfError } from '../errors/invalid-participant-cpf.error';

export type ParticipantCpfValue = string;
export type ParticipantCpfProps = { value: ParticipantCpfValue };

export class ParticipantCpf extends ValueObject<ParticipantCpfProps> {
  private constructor(props: ParticipantCpfProps) {
    super(props);
  }

  get value(): ParticipantCpfValue {
    return this.props.value;
  }

  get maskedValue(): string {
    return `***.***.***-${this.props.value.slice(-2)}`;
  }

  static create(value: ParticipantCpfValue): Result<ParticipantCpf, InvalidParticipantCpfError> {
    const normalizedValue = value.trim();
    const hasAcceptedFormat = /^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(normalizedValue);
    const digits = normalizedValue.replace(/\D/g, '');
    if (!hasAcceptedFormat || /^([0-9])\1{10}$/.test(digits) || !hasValidCheckDigits({ digits })) {
      return Result.fail(new InvalidParticipantCpfError());
    }
    return Result.ok(new ParticipantCpf({ value: digits }));
  }

  static reconstitute(value: ParticipantCpfValue): ParticipantCpf {
    return new ParticipantCpf({ value });
  }
}

type CpfCheckDigitParams = { digits: string; length: number };

function calculateCpfCheckDigit(params: CpfCheckDigitParams): number {
  let sum = 0;
  for (let index = 0; index < params.length; index += 1) {
    sum += Number(params.digits[index]) * (params.length + 1 - index);
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

type CpfCheckDigitsParams = { digits: string };

function hasValidCheckDigits(params: CpfCheckDigitsParams): boolean {
  const firstDigit = calculateCpfCheckDigit({ digits: params.digits, length: 9 });
  const secondDigit = calculateCpfCheckDigit({ digits: params.digits, length: 10 });
  return firstDigit === Number(params.digits[9]) && secondDigit === Number(params.digits[10]);
}
