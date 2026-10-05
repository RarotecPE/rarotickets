import type { PaginationMeta } from '@core/application/pagination/pagination';
import type { CouponDto } from '../../mappers/coupon.mapper';

export type ListCouponsOutputDto = { coupons: CouponDto[]; meta: PaginationMeta };
