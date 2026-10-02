import type { Coupon } from '../entities/coupon.entity.ts';

export type CouponId = string;
export type FindCouponByEventAndCodeParams = { eventId: string; code: string };

export interface ICouponRepository {
  findById(id: CouponId): Promise<Coupon | null>;
  findByEventAndCode(params: FindCouponByEventAndCodeParams): Promise<Coupon | null>;
}
