import { describe, expect, it } from "vitest";
import { PricingDomainService } from "./pricing.domain-service";

describe("PricingDomainService", () => {
  const service = new PricingDomainService();

  it("should calculate price without discount", () => {
    const res = service.execute({ originalCents: 15000 });
    expect(res.isSuccess).toBe(true);
    expect(res.value).toEqual({
      originalCents: 15000,
      discountCents: 0,
      finalCents: 15000,
    });
  });

  it("should calculate percentual discount correctly", () => {
    const res = service.execute({
      originalCents: 10000,
      discountType: "percentual",
      discountValue: 25,
    });
    expect(res.isSuccess).toBe(true);
    expect(res.value).toEqual({
      originalCents: 10000,
      discountCents: 2500,
      finalCents: 7500,
    });
  });

  it("should calculate fixed amount discount correctly (in cents)", () => {
    const res = service.execute({
      originalCents: 10000,
      discountType: "valor_fixo",
      discountValue: 3000, // R$ 30,00
    });
    expect(res.isSuccess).toBe(true);
    expect(res.value).toEqual({
      originalCents: 10000,
      discountCents: 3000,
      finalCents: 7000,
    });
  });

  it("should calculate cortesia discount (100%)", () => {
    const res = service.execute({
      originalCents: 10000,
      discountType: "cortesia",
    });
    expect(res.isSuccess).toBe(true);
    expect(res.value).toEqual({
      originalCents: 10000,
      discountCents: 10000,
      finalCents: 0,
    });
  });

  it("should not allow discount greater than original amount", () => {
    const res = service.execute({
      originalCents: 5000,
      discountType: "valor_fixo",
      discountValue: 8000,
    });
    expect(res.isSuccess).toBe(true);
    expect(res.value).toEqual({
      originalCents: 5000,
      discountCents: 5000,
      finalCents: 0,
    });
  });
});

