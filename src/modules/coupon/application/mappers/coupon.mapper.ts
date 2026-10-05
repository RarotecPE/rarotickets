import { Mapper } from '@core/application/mapper.base';
import type { Coupon } from '../../domain/entities/coupon.entity';
import { COUPON_TYPE_LABELS } from '../../domain/value-objects/coupon-type.vo';

export type CouponDto = {
  id: string;
  eventId: string;
  code: string;
  type: string;
  typeLabel: string;
  value: number;
  valueLabel: string;
  maxUses: number;
  usedCount: number;
  remainingUses: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class CouponMapper extends Mapper<{ coupon: Coupon }, CouponDto> {
  public map({ coupon }: { coupon: Coupon }): CouponDto {
    const value = coupon.value;
    return {
      id: coupon.id.toString(),
      eventId: coupon.eventId,
      code: coupon.code.value,
      type: coupon.type.value,
      typeLabel: COUPON_TYPE_LABELS[coupon.type.value],
      value,
      valueLabel: coupon.type.isPercentage()
        ? `${value}%`
        : coupon.type.isCourtesy()
          ? 'Cortesia'
          : `R$ ${value.toFixed(2).replace('.', ',')}`,
      maxUses: coupon.maxUses,
      usedCount: coupon.usedCount,
      remainingUses: Math.max(coupon.maxUses - coupon.usedCount, 0),
      startDate: coupon.startDate,
      endDate: coupon.endDate,
      isActive: coupon.isActive,
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
    };
  }
}
