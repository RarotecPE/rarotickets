import { describe, expect, it, vi } from "vitest";
import { ProcessPaymentWebhookUseCase } from "./process-payment-webhook.use-case";
import type { RegistrationRepository } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import type { ICredentialProvider } from "@/modules/ticketing/domain/services/credential-provider.interface";
import type { IOutboxRepository } from "@/modules/ticketing/domain/repositories/outbox-repository.interface";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import type { IParticipantEmailSender } from "@/modules/ticketing/domain/services/participant-email-sender.interface";

describe("ProcessPaymentWebhookUseCase", () => {
  it("dispara envio de e-mail com dados de pagamento e QR Code quando o pagamento é confirmado", async () => {
    const registrationRepository = {
      applyPaymentWebhook: vi.fn().mockResolvedValue({
        duplicate: false,
        registrationCode: "RT-2026-XYZ999",
        status: "confirmada",
        refundRequired: false,
      }),
      findNotificationDetails: vi.fn().mockResolvedValue({
        registrationId: "reg-123",
        registrationCode: "RT-2026-XYZ999",
        status: "confirmada",
        participantName: "Ana Costa",
        participantEmail: "ana@exemplo.com",
        participantPhone: "11999998888",
        eventTitle: "Summit Raro 2026",
        eventStartAt: new Date("2026-12-01T14:00:00.000Z"),
        modality: "presencial",
        location: "Belo Horizonte, MG",
        lotName: "Lote Promocional",
        originalCents: 10000,
        discountCents: 1000,
        finalCents: 9000,
        paymentProvider: "pagbank",
        paymentExternalId: "ORDE_999",
        paidAt: new Date("2026-10-10T13:45:00.000Z"),
      }),
    } as unknown as RegistrationRepository;

    const credentialProvider = {
      issueAccessToken: vi.fn().mockReturnValue({
        rawToken: "raw-access-token",
        hash: "hash-access-token",
      }),
      createQrToken: vi.fn().mockReturnValue("qr-token-assinado"),
    } as unknown as ICredentialProvider;

    const outboxRepository = {
      enqueue: vi.fn().mockResolvedValue(undefined),
    } as unknown as IOutboxRepository;

    const auditRepository = {
      write: vi.fn().mockResolvedValue(undefined),
    } as unknown as IAuditRepository;

    const emailSender = {
      sendActivationEmail: vi.fn(),
      sendOtpEmail: vi.fn(),
      sendPaymentConfirmedEmail: vi.fn().mockResolvedValue(undefined),
    } as unknown as IParticipantEmailSender;

    const useCase = new ProcessPaymentWebhookUseCase({
      registrationRepository,
      credentialProvider,
      outboxRepository,
      auditRepository,
      emailSender,
      publicBaseUrl: "https://tickets.raro.com.br/",
    });

    const result = await useCase.execute({
      provider: "pagbank",
      webhook: {
        eventId: "evt-1",
        referenceId: "reg-123",
        externalId: "ORDE_999",
        status: "pago",
        amountCents: 9000,
        rawPayload: { id: "ORDE_999" },
      },
    });

    expect(result.isSuccess).toBe(true);
    expect(credentialProvider.createQrToken).toHaveBeenCalledWith({
      registrationId: "reg-123",
    });
    expect(emailSender.sendPaymentConfirmedEmail).toHaveBeenCalledTimes(1);
    expect(emailSender.sendPaymentConfirmedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ana@exemplo.com",
        participantName: "Ana Costa",
        registrationCode: "RT-2026-XYZ999",
        eventTitle: "Summit Raro 2026",
        lotName: "Lote Promocional",
        originalCents: 10000,
        discountCents: 1000,
        finalCents: 9000,
        paymentProvider: "pagbank",
        paymentExternalId: "ORDE_999",
        qrPayload: "qr-token-assinado",
        participantUrl: "https://tickets.raro.com.br/ingressos/raw-access-token",
      }),
    );
  });
});

