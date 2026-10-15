import { describe, expect, it } from "vitest";
import { CouponCode } from "./coupon-code.vo";

describe("CouponCode Value Object", () => {
  it("should create valid uppercase alphanumeric coupon codes", () => {
    const res1 = CouponCode.create("promo10");
    expect(res1.isSuccess).toBe(true);
    expect(res1.value.value).toBe("PROMO10");

    const res2 = CouponCode.create("DESCONTO50");
    expect(res2.isSuccess).toBe(true);
    expect(res2.value.value).toBe("DESCONTO50");

    const res3 = CouponCode.create("  vip2026  ");
    expect(res3.isSuccess).toBe(true);
    expect(res3.value.value).toBe("VIP2026");
  });

  it("should reject codes with special characters or spaces inside", () => {
    expect(CouponCode.create("PROMO-10").isSuccess).toBe(false);
    expect(CouponCode.create("PROMO_10").isSuccess).toBe(false);
    expect(CouponCode.create("PROMO 10").isSuccess).toBe(false);
    expect(CouponCode.create("CUPOM@").isSuccess).toBe(false);
  });

  it("should reject codes with less than 2 or more than 40 characters", () => {
    expect(CouponCode.create("A").isSuccess).toBe(false);
    expect(CouponCode.create("").isSuccess).toBe(false);
    expect(CouponCode.create("A".repeat(41)).isSuccess).toBe(false);
    expect(CouponCode.create("A".repeat(40)).isSuccess).toBe(true);
  });
});
