import { describe, expect, it } from "vitest";
import { Identifier } from "@/@core/domain/identifier";
import { Registration } from "./registration.aggregate";

const createdAt = new Date("2026-10-07T12:00:00.000Z");
const deadline = new Date("2026-10-08T12:00:00.000Z");

function createWaitlistedRegistration() {
  return Registration.create({
    id: Identifier.fromExisting("registration-1"),
    createdAt,
    updatedAt: createdAt,
    props: {
      code: "RT-2026-0001",
      eventId: "event-1",
      participantId: "participant-1",
      lotId: null,
      couponId: null,
      answersSnapshot: {},
      originalCents: 0,
      discountCents: 0,
      finalCents: 0,
      status: "lista_espera",
      reservationExpiresAt: null,
      waitlistExpiresAt: null,
      accessTokenHash: "old-access-hash",
      credentialTokenHash: null,
      cancellationReason: null,
      confirmedAt: null,
      deletedAt: null,
    },
  });
}

describe("Registration.promoteFromWaitlist", () => {
  it("reserva uma vaga paga por 24 horas e exige pagamento", () => {
    const registration = createWaitlistedRegistration();
    expect(registration.isSuccess).toBe(true);

    const result = registration.value.promoteFromWaitlist({
      lotId: "lot-1",
      originalCents: 12000,
      finalCents: 12000,
      accessTokenHash: "new-access-hash",
      requiresPayment: true,
      at: createdAt,
      deadline,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.propsSnapshot).toMatchObject({
      status: "pendente",
      lotId: "lot-1",
      originalCents: 12000,
      discountCents: 0,
      finalCents: 12000,
      accessTokenHash: "new-access-hash",
      reservationExpiresAt: deadline,
      waitlistExpiresAt: deadline,
      confirmedAt: null,
    });
  });

  it("confirma diretamente uma vaga gratuita sem prazo de pagamento", () => {
    const registration = createWaitlistedRegistration();
    expect(registration.isSuccess).toBe(true);

    const result = registration.value.promoteFromWaitlist({
      lotId: null,
      originalCents: 0,
      finalCents: 0,
      accessTokenHash: "new-access-hash",
      requiresPayment: false,
      at: createdAt,
      deadline,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.propsSnapshot).toMatchObject({
      status: "confirmada",
      reservationExpiresAt: null,
      waitlistExpiresAt: null,
      confirmedAt: createdAt,
    });
  });

  it("rejeita uma promoção paga sem lote ou com valor inválido", () => {
    const registration = createWaitlistedRegistration();
    expect(registration.isSuccess).toBe(true);

    const missingLot = registration.value.promoteFromWaitlist({
      lotId: null,
      originalCents: 12000,
      finalCents: 12000,
      accessTokenHash: "new-access-hash",
      requiresPayment: true,
      at: createdAt,
      deadline,
    });
    expect(missingLot.isFailure).toBe(true);
    expect(missingLot.error.code).toBe("WAITLIST_PAYMENT_REQUIRED");
  });
});
