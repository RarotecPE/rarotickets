import { Result } from '@core/domain/result';
import { DomainService } from '@core/domain/domain-service.base';
import type { CouponTypeValue } from '../value-objects/coupon-type.vo';

export type CouponDiscountParams = {
  amountCents: number;
  type: CouponTypeValue;
  /** Percentual (0-100) para PERCENTUAL; reais para VALOR_FIXO; ignorado em CORTESIA. */
  value: number;
};
export type CouponDiscountResult = { discountCents: number; finalAmountCents: number; isCourtesy: boolean };

/**
 * Cálculo do desconto do cupom (§25). O valor final nunca é negativo: o
 * desconto é limitado ao valor da inscrição.
 */
export class CouponDiscountService extends DomainService<CouponDiscountParams, CouponDiscountResult> {
  execute(params: CouponDiscountParams): Result<CouponDiscountResult> {
    if (!Number.isFinite(params.amountCents) || params.amountCents < 0) {
      return Result.fail(new Error('Valor da inscrição inválido para aplicar cupom'));
    }

    if (params.type === 'CORTESIA') {
      return Result.ok({ discountCents: params.amountCents, finalAmountCents: 0, isCourtesy: true });
    }

    if (params.type === 'PERCENTUAL') {
      if (params.value < 0 || params.value > 100) {
        return Result.fail(new Error('Percentual do cupom deve estar entre 0 e 100'));
      }
      const discountCents = Math.round((params.amountCents * params.value) / 100);
      const applied = Math.min(discountCents, params.amountCents);
      return Result.ok({
        discountCents: applied,
        finalAmountCents: params.amountCents - applied,
        isCourtesy: params.amountCents - applied === 0,
      });
    }

    if (params.value < 0) {
      return Result.fail(new Error('Valor do cupom não pode ser negativo'));
    }
    const discountCents = Math.round(params.value * 100);
    const applied = Math.min(discountCents, params.amountCents);
    return Result.ok({
      discountCents: applied,
      finalAmountCents: params.amountCents - applied,
      isCourtesy: params.amountCents - applied === 0,
    });
  }
}
