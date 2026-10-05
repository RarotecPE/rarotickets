import type {
  ApplyCouponParams,
  CouponReservationResult,
  CouponSnapshot,
  ICouponCatalog,
} from '@core/contracts/coupon-catalog.contract';
import type { Coupon } from '../../../domain/entities/coupon.entity';
import { COUPON_REPOSITORY } from '../../../domain/repositories/coupon-repository.interface';
import type { ICouponRepository } from '../../../domain/repositories/coupon-repository.interface';
import { CouponDiscountService } from '../../../domain/services/coupon-discount.service';

export type CouponCatalogAdapterDependencies = {
  couponRepository: ICouponRepository;
  discountService: CouponDiscountService;
};

/** ACL de cupons usada pelo contexto de inscrições (§25). */
export class CouponCatalogAdapter implements ICouponCatalog {
  private readonly couponRepository: ICouponRepository;
  private readonly discountService: CouponDiscountService;

  constructor(dependencies: CouponCatalogAdapterDependencies) {
    this.couponRepository = dependencies.couponRepository;
    this.discountService = dependencies.discountService;
  }

  async findApplicable(params: { eventId: string; code: string; at: Date }): Promise<CouponSnapshot | null> {
    const coupon = await this.couponRepository.findByEventAndCode({ eventId: params.eventId, code: params.code });
    if (!coupon || !coupon.isApplicable(params.at)) return null;
    return this.toSnapshot(coupon);
  }

  async reserve(params: ApplyCouponParams): Promise<CouponReservationResult> {
    const coupon = await this.couponRepository.findByEventAndCode({ eventId: params.eventId, code: params.code });
    if (!coupon) return { status: 'NOT_FOUND' };
    if (!coupon.isActive) return { status: 'INVALID', message: 'Cupom inativo' };
    if (!coupon.isWithinPeriod(params.at)) return { status: 'INVALID', message: 'Cupom fora do período de validade' };
    if (!coupon.type.isCourtesy() && !coupon.hasAvailableUses()) return { status: 'EXHAUSTED' };

    const discountResult = this.discountService.execute({
      amountCents: params.amountCents,
      type: coupon.type.value,
      value: coupon.value,
    });
    if (discountResult.isFailure) return { status: 'INVALID', message: discountResult.error.message };

    const consumed = await this.couponRepository.consumeUse({
      couponId: coupon.id.toString(),
      registrationId: params.registrationId,
      discountCents: discountResult.value.discountCents,
      at: params.at,
    });
    if (!consumed) return { status: 'EXHAUSTED' };

    const updated = await this.couponRepository.findById(coupon.id.toString());
    return {
      status: 'RESERVED',
      coupon: this.toSnapshot(updated ?? coupon),
      discountCents: discountResult.value.discountCents,
    };
  }

  async release(params: { registrationId: string }): Promise<void> {
    await this.couponRepository.releaseUse({ registrationId: params.registrationId });
  }

  private toSnapshot(coupon: Coupon): CouponSnapshot {
    return {
      id: coupon.id.toString(),
      eventId: coupon.eventId,
      code: coupon.code.value,
      type: coupon.type.value,
      value: coupon.value,
      maxUses: coupon.maxUses,
      usedCount: coupon.usedCount,
      startDate: coupon.startDate,
      endDate: coupon.endDate,
      isActive: coupon.isActive,
    };
  }
}
