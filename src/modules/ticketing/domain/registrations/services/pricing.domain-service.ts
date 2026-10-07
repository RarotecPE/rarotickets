import { DomainService } from "@/@core/domain/domain-service.base";
import { Result } from "@/@core/domain/result";

export type DiscountType = "percentual" | "valor_fixo" | "cortesia";
export type CalculatePriceParams = {
  originalCents: number;
  discountType?: DiscountType | null;
  discountValue?: number | null;
};
export type CalculatedPrice = {
  originalCents: number;
  discountCents: number;
  finalCents: number;
};

export class PricingDomainService extends DomainService<CalculatePriceParams, CalculatedPrice> {
  execute(params: CalculatePriceParams): Result<CalculatedPrice> {
    if (!Number.isSafeInteger(params.originalCents) || params.originalCents < 0) {
      return Result.fail(new Error("O preço original precisa ser um valor não negativo em centavos."));
    }
    const discount = PricingDomainService.calculateDiscount(params);
    const discountCents = Math.min(params.originalCents, discount);
    return Result.ok({
      originalCents: params.originalCents,
      discountCents,
      finalCents: Math.max(0, params.originalCents - discountCents),
    });
  }

  private static calculateDiscount(params: CalculatePriceParams): number {
    if (!params.discountType) return 0;
    if (params.discountType === "cortesia") return params.originalCents;
    const value = Math.max(0, params.discountValue ?? 0);
    if (params.discountType === "percentual") {
      return Math.round((params.originalCents * Math.min(value, 100)) / 100);
    }
    return Math.round(value * 100);
  }
}
