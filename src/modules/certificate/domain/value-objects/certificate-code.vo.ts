import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type CertificateCodeProps = { value: string };

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PATTERN = /^CERT-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]$/;

/**
 * Código público de validação do certificado (§30): aleatório, com dígito
 * verificador e sem caracteres ambíguos — nunca sequencial.
 */
export class CertificateCode extends ValueObject<CertificateCodeProps> {
  private constructor(props: CertificateCodeProps) { super(props); }

  get value(): string { return this.props.value; }

  public static generate(): CertificateCode {
    return new CertificateCode({ value: CertificateCode.buildBody() });
  }

  public static reconstitute(value: string): CertificateCode {
    return new CertificateCode({ value });
  }

  public static create(value: string): Result<CertificateCode> {
    const normalized = value.trim().toUpperCase();
    if (!PATTERN.test(normalized) || !CertificateCode.isValid(normalized)) {
      return Result.fail(new Error('Código de certificado inválido'));
    }
    return Result.ok(new CertificateCode({ value: normalized }));
  }

  public isValid(): boolean {
    return CertificateCode.isValid(this.props.value);
  }

  private static buildBody(): string {
    let body = '';
    for (let index = 0; index < 8; index += 1) {
      body += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
    }
    const grouped = `${body.slice(0, 4)}-${body.slice(4, 8)}`;
    return `CERT-${grouped}-${CertificateCode.checkDigit(body)}`;
  }

  private static checkDigit(body: string): string {
    let sum = 7;
    for (let index = 0; index < body.length; index += 1) {
      sum += ALPHABET.indexOf(body.charAt(index)) * (index + 2);
    }
    return ALPHABET.charAt(sum % ALPHABET.length);
  }

  private static isValid(value: string): boolean {
    const body = value.replace(/^CERT-/, '').replace(/-/g, '');
    if (body.length !== 9) return false;
    const payload = body.slice(0, 8);
    const digit = body.slice(8);
    return CertificateCode.checkDigit(payload) === digit;
  }
}
