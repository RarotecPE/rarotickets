import { describe, expect, it } from "vitest";
import { Coupon } from "./coupon.entity";

describe("Coupon Entity", () => {
  const lotDates = {
    startAt: new Date("2026-11-01T08:00:00Z"),
    endAt: new Date("2026-11-30T23:59:59Z"),
    priceCents: 10000, // R$ 100,00
  };

  it("should create a valid percentual coupon", () => {
    const couponResult = Coupon.create({
      eventId: "event-1",
      lotId: "lot-1",
      code: "BLACKFRIDAY",
      type: "percentual",
      discountValue: 20,
      startAt: new Date("2026-11-05T00:00:00Z"),
      endAt: new Date("2026-11-20T23:59:59Z"),
    });

    expect(couponResult.isSuccess).toBe(true);
    const coupon = couponResult.value;
    expect(coupon.code).toBe("BLACKFRIDAY");
    expect(coupon.type).toBe("percentual");
    expect(coupon.calculateDiscount(lotDates.priceCents)).toBe(2000); // 20% of 100,00 = 20,00
  });

  it("should create a valid fixed amount coupon", () => {
    const couponResult = Coupon.create({
      eventId: "event-1",
      lotId: "lot-1",
      code: "DEZREAIS",
      type: "valor_fixo",
      discountValue: 1000, // R$ 10,00
      startAt: new Date("2026-11-05T00:00:00Z"),
      endAt: new Date("2026-11-20T23:59:59Z"),
    });

    expect(couponResult.isSuccess).toBe(true);
    const coupon = couponResult.value;
    expect(coupon.calculateDiscount(lotDates.priceCents)).toBe(1000);
  });

  it("should reject fixed coupon if discount exceeds lot price", () => {
    const coupon = Coupon.create({
      eventId: "event-1",
      lotId: "lot-1",
      code: "SUPERDESCONTO",
      type: "valor_fixo",
      discountValue: 15000, // R$ 150,00 (lot is R$ 100,00)
      startAt: new Date("2026-11-05T00:00:00Z"),
      endAt: new Date("2026-11-20T23:59:59Z"),
    }).value;

    const validation = coupon.validateForLot(lotDates);
    expect(validation.isFailure).toBe(true);
    expect(validation.error.message).toContain("não pode exceder o valor do lote");
  });

  it("should validate that coupon dates must be within lot dates", () => {
    // Coupon starts before lot
    const earlyCoupon = Coupon.create({
      eventId: "event-1",
      lotId: "lot-1",
      code: "EARLY",
      type: "percentual",
      discountValue: 10,
      startAt: new Date("2026-10-31T23:59:59Z"), // before lot.startAt
      endAt: new Date("2026-11-20T23:59:59Z"),
    }).value;

    expect(earlyCoupon.validateForLot(lotDates).isFailure).toBe(true);

    // Coupon ends after lot
    const lateCoupon = Coupon.create({
      eventId: "event-1",
      lotId: "lot-1",
      code: "LATE",
      type: "percentual",
      discountValue: 10,
      startAt: new Date("2026-11-05T00:00:00Z"),
      endAt: new Date("2026-12-01T00:00:00Z"), // after lot.endAt
    }).value;

    expect(lateCoupon.validateForLot(lotDates).isFailure).toBe(true);

    // Coupon strictly within lot
    const validCoupon = Coupon.create({
      eventId: "event-1",
      lotId: "lot-1",
      code: "VALID",
      type: "percentual",
      discountValue: 10,
      startAt: new Date("2026-11-01T08:00:00Z"), // exact lot start
      endAt: new Date("2026-11-30T23:59:59Z"), // exact lot end
    }).value;

    expect(validCoupon.validateForLot(lotDates).isSuccess).toBe(true);
  });

  it("should handle participant CPF and Email restrictions correctly", () => {
    const coupon = Coupon.create({
      eventId: "event-1",
      lotId: "lot-1",
      code: "RESTRICTED",
      type: "percentual",
      discountValue: 15,
      startAt: lotDates.startAt,
      endAt: lotDates.endAt,
      allowedEmails: ["vip@example.com"],
      allowedCpfs: ["123.456.789-01"],
    }).value;

    // Matching email
    expect(coupon.canBeUsedBy({ email: "vip@example.com" })).toBe(true);
    expect(coupon.canBeUsedBy({ email: " VIP@EXAMPLE.COM " })).toBe(true);

    // Matching CPF
    expect(coupon.canBeUsedBy({ email: "other@example.com", cpf: "12345678901" })).toBe(true);
    expect(coupon.canBeUsedBy({ email: "other@example.com", cpf: "123.456.789-01" })).toBe(true);

    // Neither matches
    expect(coupon.canBeUsedBy({ email: "stranger@example.com", cpf: "99999999999" })).toBe(false);
  });

  it("should check availability against current date and max uses", () => {
    const coupon = Coupon.create({
      eventId: "event-1",
      lotId: "lot-1",
      code: "LIMITED",
      type: "percentual",
      discountValue: 10,
      startAt: new Date("2026-11-10T00:00:00Z"),
      endAt: new Date("2026-11-20T00:00:00Z"),
      maxUses: 5,
      usedCount: 4,
    }).value;

    // Before start
    expect(coupon.isAvailable(new Date("2026-11-09T23:59:59Z"))).toBe(false);
    // After end
    expect(coupon.isAvailable(new Date("2026-11-20T00:00:01Z"))).toBe(false);
    // Within dates, 4 used out of 5
    expect(coupon.isAvailable(new Date("2026-11-15T12:00:00Z"))).toBe(true);
    // With 1 held item -> 4 + 1 >= 5 -> unavailable
    expect(coupon.isAvailable(new Date("2026-11-15T12:00:00Z"), 1)).toBe(false);
  });
});

