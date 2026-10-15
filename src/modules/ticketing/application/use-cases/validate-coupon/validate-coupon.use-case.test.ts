import { describe, expect, it, vi } from "vitest";
import { ValidateCouponUseCase } from "./validate-coupon.use-case";
import { Result } from "@/@core/domain/result";
import { CouponUnavailableError } from "@/modules/ticketing/domain/coupons/entities/coupon.entity";

describe("ValidateCouponUseCase", () => {
  const fakeEvent = {
    id: "event-1",
    props: { status: "inscricoes_abertas" },
    lots: [
      {
        id: "lot-1",
        priceCents: 10000,
        active: true,
      },
      {
        id: "lot-inactive",
        priceCents: 10000,
        active: false,
      },
    ],
  };

  it("should return generic error if event does not exist", async () => {
    const eventRepo = {
      getPublicBySlug: vi.fn().mockResolvedValue(null),
    } as any;
    const regRepo = {
      validateCoupon: vi.fn(),
    } as any;

    const useCase = new ValidateCouponUseCase({
      eventRepository: eventRepo,
      registrationRepository: regRepo,
    });

    const res = await useCase.execute({
      slug: "inexistente",
      lotId: "lot-1",
      code: "PROMO10",
    });

    expect(res.isFailure).toBe(true);
    expect(res.error.message).toBe("Cupom não disponível.");
  });

  it("should return generic error if lot is inactive or not found", async () => {
    const eventRepo = {
      getPublicBySlug: vi.fn().mockResolvedValue(fakeEvent),
    } as any;
    const regRepo = {
      validateCoupon: vi.fn(),
    } as any;

    const useCase = new ValidateCouponUseCase({
      eventRepository: eventRepo,
      registrationRepository: regRepo,
    });

    const res = await useCase.execute({
      slug: "tech-conf",
      lotId: "lot-inactive",
      code: "PROMO10",
    });

    expect(res.isFailure).toBe(true);
    expect(res.error.message).toBe("Cupom não disponível.");
  });

  it("should return generic error if registration repository fails validation", async () => {
    const eventRepo = {
      getPublicBySlug: vi.fn().mockResolvedValue(fakeEvent),
    } as any;
    const regRepo = {
      validateCoupon: vi.fn().mockResolvedValue(
        Result.fail(new CouponUnavailableError("Limite esgotado"))
      ),
    } as any;

    const useCase = new ValidateCouponUseCase({
      eventRepository: eventRepo,
      registrationRepository: regRepo,
    });

    const res = await useCase.execute({
      slug: "tech-conf",
      lotId: "lot-1",
      code: "PROMO10",
    });

    expect(res.isFailure).toBe(true);
    // Invariant: Always returns generic message to participant
    expect(res.error.message).toBe("Cupom não disponível.");
  });

  it("should return coupon calculation on success", async () => {
    const eventRepo = {
      getPublicBySlug: vi.fn().mockResolvedValue(fakeEvent),
    } as any;
    const regRepo = {
      validateCoupon: vi.fn().mockResolvedValue(
        Result.ok({
          couponId: "c-1",
          code: "PROMO10",
          type: "percentual",
          discountValue: 10,
          originalCents: 10000,
          discountCents: 1000,
          finalCents: 9000,
        })
      ),
    } as any;

    const useCase = new ValidateCouponUseCase({
      eventRepository: eventRepo,
      registrationRepository: regRepo,
    });

    const res = await useCase.execute({
      slug: "tech-conf",
      lotId: "lot-1",
      code: "PROMO10",
    });

    expect(res.isSuccess).toBe(true);
    expect(res.value).toEqual({
      couponId: "c-1",
      code: "PROMO10",
      type: "percentual",
      discountValue: 10,
      originalCents: 10000,
      discountCents: 1000,
      finalCents: 9000,
    });
  });
});
