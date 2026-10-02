import type { Coupon } from '../entities/coupon.entity.ts';
import type { CouponId, FindCouponByEventAndCodeParams, ICouponRepository } from './coupon-repository.interface.ts';

export abstract class CouponRepository implements ICouponRepository {
  abstract findById(id: CouponId): Promise<Coupon | null>;
  abstract findByEventAndCode(params: FindCouponByEventAndCodeParams): Promise<Coupon | null>;
}
