import { PersistenceMapper } from '@core/application/persistence-mapper.base';
import type { ToDomainParams, ToPersistenceParams } from '@core/application/persistence-mapper.base';
import { Identifier } from '@core/domain/identifier';
import { Coupon } from '../../../../domain/entities/coupon.entity';
import { CouponCode } from '../../../../domain/value-objects/coupon-code.vo';
import { CouponType } from '../../../../domain/value-objects/coupon-type.vo';
import type { CouponTypeValue } from '../../../../domain/value-objects/coupon-type.vo';
import type { CouponModel } from '../models/coupon.model';

export type CouponData = Omit<CouponModel, 'created_at' | 'updated_at'> & {
  created_at: Date;
  updated_at: Date;
};

export class CouponPersistenceMapper extends PersistenceMapper<Coupon, CouponModel, CouponData> {
  public toDomain({ record }: ToDomainParams<CouponModel>): Coupon {
    return Coupon.reconstitute({
      props: {
        eventId: record.event_id,
        code: CouponCode.reconstitute(record.code),
        type: CouponType.reconstitute(record.type as CouponTypeValue),
        value: Number(record.value),
        maxUses: record.max_uses,
        usedCount: record.used_count,
        startDate: new Date(record.start_date),
        endDate: new Date(record.end_date),
        isActive: record.is_active,
        createdBy: record.created_by,
      },
      id: Identifier.fromExisting(record.id),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    });
  }

  public toPersistence({ entity }: ToPersistenceParams<Coupon>): CouponData {
    return {
      id: entity.id.toString(),
      event_id: entity.eventId,
      code: entity.code.value,
      type: entity.type.value,
      value: entity.value.toFixed(2),
      max_uses: entity.maxUses,
      used_count: entity.usedCount,
      start_date: entity.startDate,
      end_date: entity.endDate,
      is_active: entity.isActive,
      created_by: entity.createdBy,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }
}
