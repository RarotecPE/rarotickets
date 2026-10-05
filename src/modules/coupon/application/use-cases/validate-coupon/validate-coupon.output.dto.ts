import type { CouponDto } from '../../mappers/coupon.mapper';

export type ValidateCouponOutputDto = {
  coupon: CouponDto;
  discountCents: number;
  finalAmountCents: number;
  isCourtesy: boolean;
  discountFormatted: string;
  finalAmountFormatted: string;
};
