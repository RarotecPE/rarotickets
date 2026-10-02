import { ValueObject } from '../../../../@core/domain/value-object.base.ts';
import { Result } from '../../../../@core/domain/result.ts';
import { ValidationError } from '../../../../@core/domain/errors/domain-errors.ts';
import type { CouponDiscountType } from '../entities/coupon.entity.ts';

export type RegistrationPricingProps = {
  baseAmountInMinorUnits: number;
  discountAmountInMinorUnits: number;
  finalAmountInMinorUnits: number;
  couponId: string | null;
  couponCode: string | null;
  couponType: CouponDiscountType | null;
};
export type CreateRegistrationPricingParams = {
  baseAmountInMinorUnits: number;
  discountAmountInMinorUnits: number;
  couponId: string | null;
  couponCode: string | null;
  couponType: CouponDiscountType | null;
};

export class RegistrationPricing extends ValueObject<RegistrationPricingProps> {
  private constructor(props: RegistrationPricingProps) {
    super(props);
  }

  public get baseAmountInMinorUnits(): number { return this.props.baseAmountInMinorUnits; }
  public get discountAmountInMinorUnits(): number { return this.props.discountAmountInMinorUnits; }
  public get finalAmountInMinorUnits(): number { return this.props.finalAmountInMinorUnits; }
  public get couponId(): string | null { return this.props.couponId; }
  public get couponCode(): string | null { return this.props.couponCode; }
  public get couponType(): CouponDiscountType | null { return this.props.couponType; }

  public static create(params: CreateRegistrationPricingParams): Result<RegistrationPricing, ValidationError> {
    const amounts = [params.baseAmountInMinorUnits, params.discountAmountInMinorUnits];
    const isInvalid = amounts.some((amount) => !Number.isSafeInteger(amount) || amount < 0)
      || params.discountAmountInMinorUnits > params.baseAmountInMinorUnits;
    if (isInvalid) {
      return Result.fail(new ValidationError({ code: 'REGISTRATION_PRICE_INVALID', message: 'O desconto não pode ser negativo nem superior ao valor original.' }));
    }
    if ((params.couponId === null) !== (params.couponCode === null)
      || (params.couponId === null) !== (params.couponType === null)) {
      return Result.fail(new ValidationError({ code: 'REGISTRATION_COUPON_SNAPSHOT_INVALID', message: 'Os dados do cupom devem ser registrados em conjunto.' }));
    }
    return Result.ok(new RegistrationPricing({
      baseAmountInMinorUnits: params.baseAmountInMinorUnits,
      discountAmountInMinorUnits: params.discountAmountInMinorUnits,
      finalAmountInMinorUnits: params.baseAmountInMinorUnits - params.discountAmountInMinorUnits,
      couponId: params.couponId,
      couponCode: params.couponCode,
      couponType: params.couponType,
    }));
  }

  public snapshot(): RegistrationPricingProps {
    return { ...this.props };
  }
}
