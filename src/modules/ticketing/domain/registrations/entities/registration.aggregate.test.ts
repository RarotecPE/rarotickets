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

describe("Registration.extendReservation", () => {
  it("estende a reserva para uma data futura em inscrição aguardando pagamento", () => {
    const registration = Registration.create({
      id: Identifier.fromExisting("registration-1"),
      createdAt,
      updatedAt: createdAt,
      props: {
        code: "RT-2026-0001",
        eventId: "event-1",
        participantId: "participant-1",
        lotId: "lot-1",
        couponId: null,
        answersSnapshot: {},
        originalCents: 10000,
        discountCents: 0,
        finalCents: 10000,
        status: "aguardando_pagamento",
        reservationExpiresAt: new Date("2026-10-07T12:15:00.000Z"),
        waitlistExpiresAt: null,
        accessTokenHash: "hash-1",
        credentialTokenHash: null,
        cancellationReason: null,
        confirmedAt: null,
        deletedAt: null,
      },
    });

    expect(registration.isSuccess).toBe(true);
    const newExpiresAt = new Date("2026-10-09T12:00:00.000Z");
    const result = registration.value.extendReservation({
      newExpiresAt,
      at: createdAt,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.propsSnapshot.reservationExpiresAt).toEqual(newExpiresAt);
    expect(result.value.status).toBe("aguardando_pagamento");
  });

  it("reativa e estende a reserva de uma inscrição cancelada por expiração de reserva", () => {
    const registration = Registration.create({
      id: Identifier.fromExisting("registration-2"),
      createdAt,
      updatedAt: createdAt,
      props: {
        code: "RT-2026-0002",
        eventId: "event-1",
        participantId: "participant-1",
        lotId: "lot-1",
        couponId: null,
        answersSnapshot: {},
        originalCents: 10000,
        discountCents: 0,
        finalCents: 10000,
        status: "cancelada",
        reservationExpiresAt: null,
        waitlistExpiresAt: null,
        accessTokenHash: "hash-2",
        credentialTokenHash: null,
        cancellationReason: "Reserva expirada",
        confirmedAt: null,
        deletedAt: null,
      },
    });

    expect(registration.isSuccess).toBe(true);
    const newExpiresAt = new Date("2026-10-09T12:00:00.000Z");
    const result = registration.value.extendReservation({
      newExpiresAt,
      at: createdAt,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.status).toBe("aguardando_pagamento");
    expect(result.value.propsSnapshot.cancellationReason).toBeNull();
    expect(result.value.propsSnapshot.reservationExpiresAt).toEqual(newExpiresAt);
  });

  it("rejeita data de expiração no passado ou igual ao momento atual", () => {
    const registration = Registration.create({
      id: Identifier.fromExisting("registration-3"),
      createdAt,
      updatedAt: createdAt,
      props: {
        code: "RT-2026-0003",
        eventId: "event-1",
        participantId: "participant-1",
        lotId: "lot-1",
        couponId: null,
        answersSnapshot: {},
        originalCents: 10000,
        discountCents: 0,
        finalCents: 10000,
        status: "aguardando_pagamento",
        reservationExpiresAt: new Date("2026-10-07T12:15:00.000Z"),
        waitlistExpiresAt: null,
        accessTokenHash: "hash-3",
        credentialTokenHash: null,
        cancellationReason: null,
        confirmedAt: null,
        deletedAt: null,
      },
    });

    const pastDate = new Date("2026-10-07T11:00:00.000Z");
    const result = registration.value.extendReservation({
      newExpiresAt: pastDate,
      at: createdAt,
    });

    expect(result.isFailure).toBe(true);
    expect(result.error.code).toBe("INVALID_RESERVATION_EXPIRY");
  });

  it("rejeita extensão em inscrições já confirmadas", () => {
    const registration = Registration.create({
      id: Identifier.fromExisting("registration-4"),
      createdAt,
      updatedAt: createdAt,
      props: {
        code: "RT-2026-0004",
        eventId: "event-1",
        participantId: "participant-1",
        lotId: "lot-1",
        couponId: null,
        answersSnapshot: {},
        originalCents: 10000,
        discountCents: 0,
        finalCents: 10000,
        status: "confirmada",
        reservationExpiresAt: null,
        waitlistExpiresAt: null,
        accessTokenHash: "hash-4",
        credentialTokenHash: null,
        cancellationReason: null,
        confirmedAt: createdAt,
        deletedAt: null,
      },
    });

    const newExpiresAt = new Date("2026-10-09T12:00:00.000Z");
    const result = registration.value.extendReservation({
      newExpiresAt,
      at: createdAt,
    });

    expect(result.isFailure).toBe(true);
    expect(result.error.code).toBe("CANNOT_EXTEND_RESERVATION");
  });
});
