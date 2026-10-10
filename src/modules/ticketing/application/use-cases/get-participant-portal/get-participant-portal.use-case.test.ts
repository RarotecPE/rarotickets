import { describe, expect, it, vi } from "vitest";
import { GetParticipantPortalUseCase } from "./get-participant-portal.use-case";
import type { RegistrationRepository } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import type { ICredentialProvider } from "@/modules/ticketing/domain/services/credential-provider.interface";

describe("GetParticipantPortalUseCase", () => {
  const samplePortal = {
    registrationId: "1ea33b30-169a-4784-b033-77b9c3370c8d",
    code: "INS-2026-ABCD1234",
    status: "confirmada" as const,
    name: "Participante Teste",
    email: "participante@teste.com",
    eventId: "event-1",
    eventTitle: "Evento Teste",
    eventSlug: "evento-teste",
    eventStartAt: new Date("2026-12-01T10:00:00Z"),
    eventEndAt: new Date("2026-12-01T18:00:00Z"),
    modality: "presencial" as const,
    onlineUrl: null,
    location: "Belo Horizonte, MG",
    lotName: "Lote 1",
    originalCents: 10000,
    discountCents: 0,
    finalCents: 10000,
    reservationExpiresAt: null,
    waitlistExpiresAt: null,
    credentialToken: null,
    qrPayload: null,
    checkoutUrl: null,
    certificateCode: null,
    certificateIssuedAt: null,
  };

  it("finds portal using raw accessToken by hashing it first", async () => {
    const findPortalMock = vi.fn().mockImplementation(async ({ accessTokenHash }) =>
      accessTokenHash === "hashed-raw-token" ? samplePortal : null,
    );
    const registrationRepository = {
      findPortal: findPortalMock,
    } as unknown as RegistrationRepository;

    const credentialProvider = {
      hashToken: vi.fn().mockReturnValue("hashed-raw-token"),
      createQrToken: vi.fn().mockReturnValue("RT1.qr.payload"),
    } as unknown as ICredentialProvider;

    const useCase = new GetParticipantPortalUseCase({
      registrationRepository,
      credentialProvider,
    });

    const result = await useCase.execute({
      accessToken: "PT1.1ea33b30-169a-4784-b033-77b9c3370c8d.sig",
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.qrPayload).toBe("RT1.qr.payload");
    expect(findPortalMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to direct 64-char hex accessTokenHash when link contains stored hash", async () => {
    const storedHash =
      "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
    const findPortalMock = vi
      .fn()
      .mockImplementation(async ({ accessTokenHash }) =>
        accessTokenHash === storedHash ? samplePortal : null,
      );
    const registrationRepository = {
      findPortal: findPortalMock,
    } as unknown as RegistrationRepository;

    const credentialProvider = {
      hashToken: vi.fn().mockReturnValue("double-hashed-value"),
      createQrToken: vi.fn().mockReturnValue("RT1.qr.payload"),
    } as unknown as ICredentialProvider;

    const useCase = new GetParticipantPortalUseCase({
      registrationRepository,
      credentialProvider,
    });

    const result = await useCase.execute({
      accessToken: storedHash,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.code).toBe("INS-2026-ABCD1234");
    expect(result.value.qrPayload).toBe("RT1.qr.payload");
    expect(findPortalMock).toHaveBeenCalledTimes(2);
  });
});

