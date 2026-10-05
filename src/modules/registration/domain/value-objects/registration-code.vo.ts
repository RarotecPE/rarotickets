import { Result } from '@core/domain/result';
import { normalizeCode } from '@core/domain/text.util';
import { ValueObject } from '@core/domain/value-object.base';

export type RegistrationCodeProps = { value: string };

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const REGISTRATION_CODE_PREFIX = 'RT';

/**
 * Código único da inscrição (§7 e §28): aleatório, sem sequência interna
 * exposta e com dígito de verificação para evitar códigos inválidos.
 */
export class RegistrationCode extends ValueObject<RegistrationCodeProps> {
  private constructor(props: RegistrationCodeProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static generate(): RegistrationCode {
    let body = '';
    for (let index = 0; index < 8; index += 1) {
      body += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    const checkDigit = RegistrationCode.checkDigit(body);
    return new RegistrationCode({ value: `${REGISTRATION_CODE_PREFIX}-${body}-${checkDigit}` });
  }

  public static create(value: string): Result<RegistrationCode> {
    const normalized = normalizeCode(value);
    const match = /^RT-([A-Z0-9]{8})-([A-Z0-9])$/.exec(normalized);
    if (!match) return Result.fail(new Error('Código de inscrição inválido'));

    const body = match[1] ?? '';
    const checkDigit = match[2] ?? '';
    if (RegistrationCode.checkDigit(body) !== checkDigit) {
      return Result.fail(new Error('Código de inscrição inválido'));
    }
    return Result.ok(new RegistrationCode({ value: normalized }));
  }

  public static reconstitute(value: string): RegistrationCode {
    return new RegistrationCode({ value });
  }

  public isValid(): boolean {
    return RegistrationCode.create(this.props.value).isSuccess;
  }

  private static checkDigit(body: string): string {
    let sum = 0;
    for (let index = 0; index < body.length; index += 1) {
      sum += ALPHABET.indexOf(body.charAt(index)) * (index + 3);
    }
    return ALPHABET[sum % ALPHABET.length] ?? 'A';
  }
}
