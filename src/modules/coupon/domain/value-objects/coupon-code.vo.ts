import { Result } from '@core/domain/result';
import { normalizeCode } from '@core/domain/text.util';
import { ValueObject } from '@core/domain/value-object.base';

export type CouponCodeProps = { value: string };
const PATTERN = /^[A-Z0-9][A-Z0-9-]{2,31}$/;

/** Código do cupom: maiúsculas, sem espaços e sem caracteres ambíguos (§25). */
export class CouponCode extends ValueObject<CouponCodeProps> {
  private constructor(props: CouponCodeProps) { super(props); }

  get value(): string { return this.props.value; }

  public static create(rawCode: string): Result<CouponCode> {
    const normalized = normalizeCode(rawCode).replace(/\s+/g, '');
    if (!PATTERN.test(normalized)) {
      return Result.fail(new Error('Código de cupom inválido: use de 3 a 32 caracteres alfanuméricos'));
    }
    return Result.ok(new CouponCode({ value: normalized }));
  }

  public static reconstitute(value: string): CouponCode {
    return new CouponCode({ value });
  }
}
