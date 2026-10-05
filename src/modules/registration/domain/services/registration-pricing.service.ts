import { DomainService } from '@core/domain/domain-service.base';
import { Result } from '@core/domain/result';
import { MoneyVO } from '@core/domain/value-objects/money.vo';

export type AppliedCoupon = {
  id: string;
  code: string;
  type: 'PERCENTUAL' | 'VALOR_FIXO' | 'CORTESIA';
  value: number;
};

export type ComputeRegistrationPriceParams = {
  basePriceCents: number;
  coupon?: AppliedCoupon | null;
  isCourtesy?: boolean;
  courtesyReason?: string | null;
};

export type ComputedRegistrationPrice = {
  priceCents: number;
  discountCents: number;
  finalAmountCents: number;
  isCourtesy: boolean;
  couponId: string | null;
  couponCode: string | null;
};

/**
 * Calcula valor, desconto e valor final da inscrição (§5, §24 e §25).
 * O valor final nunca pode ficar negativo.
 */
export class RegistrationPricingService extends DomainService<
  ComputeRegistrationPriceParams,
  ComputedRegistrationPrice
> {
  execute(params: ComputeRegistrationPriceParams): Result<ComputedRegistrationPrice> {
    const priceResult = MoneyVO.create({ cents: params.basePriceCents });
    if (priceResult.isFailure) return Result.fail(priceResult.error);
    const price = priceResult.value;

    const isCourtesy = params.isCourtesy === true || params.coupon?.type === 'CORTESIA';
    if (isCourtesy) {
      return Result.ok({
        priceCents: price.cents,
        discountCents: price.cents,
        finalAmountCents: 0,
        isCourtesy: true,
        couponId: params.coupon?.id ?? null,
        couponCode: params.coupon?.code ?? null,
      });
    }

    if (!params.coupon) {
      return Result.ok({
        priceCents: price.cents,
        discountCents: 0,
        finalAmountCents: price.cents,
        isCourtesy: false,
        couponId: null,
        couponCode: null,
      });
    }

    const discountResult = this.computeDiscount(price, params.coupon);
    if (discountResult.isFailure) return Result.fail(discountResult.error);

    // Valor final nunca negativo: desconto é limitado ao valor da inscrição.
    const discount = discountResult.value.isGreaterThan(price) ? price : discountResult.value;

    return Result.ok({
      priceCents: price.cents,
      discountCents: discount.cents,
      finalAmountCents: price.subtractClampedToZero(discount).cents,
      isCourtesy: false,
      couponId: params.coupon.id,
      couponCode: params.coupon.code,
    });
  }

  private computeDiscount(price: MoneyVO, coupon: AppliedCoupon): Result<MoneyVO> {
    if (coupon.type === 'PERCENTUAL') {
      return price.percentage(coupon.value);
    }
    if (coupon.type === 'VALOR_FIXO') {
      return MoneyVO.create({ cents: Math.round(coupon.value * 100) });
    }
    return Result.ok(price);
  }
}
