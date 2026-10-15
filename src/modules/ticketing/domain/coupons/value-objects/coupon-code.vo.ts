import { ValueObject } from "@/@core/domain/value-object.base";
import { Result } from "@/@core/domain/result";
import { DomainError } from "@/@core/domain/errors/domain-error.base";

export type CouponCodeValue = string;
export type CouponCodeProps = { value: CouponCodeValue };
export type InvalidCouponCodeErrorParams = { value: CouponCodeValue };

export class InvalidCouponCodeError extends DomainError {
  constructor(params: InvalidCouponCodeErrorParams) {
    super({
      code: "INVALID_COUPON_CODE",
      message: `Código de cupom inválido: "${params.value}". Utilize apenas letras e números (2 a 40 caracteres).`,
    });
  }
}

export class CouponCode extends ValueObject<CouponCodeProps> {
  private constructor(props: CouponCodeProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  static create(value: CouponCodeValue): Result<CouponCode, InvalidCouponCodeError> {
    if (!value || typeof value !== "string") {
      return Result.fail(new InvalidCouponCodeError({ value: String(value ?? "") }));
    }

    const normalized = value.trim().toUpperCase();
    if (normalized.length < 2 || normalized.length > 40) {
      return Result.fail(new InvalidCouponCodeError({ value }));
    }

    if (!/^[A-Z0-9]+$/.test(normalized)) {
      return Result.fail(new InvalidCouponCodeError({ value }));
    }

    return Result.ok(new CouponCode({ value: normalized }));
  }
}

