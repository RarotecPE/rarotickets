import type { Coupon } from '../entities/coupon.entity';
import type {
  CouponFilter,
  CouponUsageRecord,
  ICouponRepository,
  ListCouponsResult,
} from './coupon-repository.interface';

export abstract class CouponRepository implements ICouponRepository {
  abstract findById(id: string): Promise<Coupon | null>;
  abstract findByEventAndCode(params: { eventId: string; code: string }): Promise<Coupon | null>;
  abstract list(filter: CouponFilter): Promise<ListCouponsResult>;
  abstract listByEvent(eventId: string): Promise<Coupon[]>;
  abstract save(coupon: Coupon): Promise<void>;
  abstract update(coupon: Coupon): Promise<void>;
  abstract consumeUse(params: {
    couponId: string;
    registrationId: string;
    discountCents: number;
    at: Date;
  }): Promise<boolean>;
  abstract releaseUse(params: { registrationId: string }): Promise<boolean>;
  abstract findUsageByRegistration(registrationId: string): Promise<CouponUsageRecord | null>;
}
