import type { Coupon } from '../entities/coupon.entity';

export type CouponFilter = {
  eventId?: string | null;
  search?: string | null;
  isActive?: boolean | null;
  page: number;
  perPage: number;
};
export type ListCouponsResult = { coupons: Coupon[]; total: number };
export type CouponUsageRecord = {
  couponId: string;
  registrationId: string;
  discountCents: number;
  createdAt: Date;
  releasedAt: Date | null;
};

export interface ICouponRepository {
  findById(id: string): Promise<Coupon | null>;
  findByEventAndCode(params: { eventId: string; code: string }): Promise<Coupon | null>;
  list(filter: CouponFilter): Promise<ListCouponsResult>;
  listByEvent(eventId: string): Promise<Coupon[]>;
  save(coupon: Coupon): Promise<void>;
  update(coupon: Coupon): Promise<void>;
  /** Consome uma unidade de forma atômica; falha quando o cupom esgota (§25). */
  consumeUse(params: { couponId: string; registrationId: string; discountCents: number; at: Date }): Promise<boolean>;
  releaseUse(params: { registrationId: string }): Promise<boolean>;
  findUsageByRegistration(registrationId: string): Promise<CouponUsageRecord | null>;
}

export const COUPON_REPOSITORY = Symbol('ICouponRepository');
