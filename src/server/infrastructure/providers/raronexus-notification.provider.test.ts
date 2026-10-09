import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RaroNexusNotificationProvider } from "./raronexus-notification.provider";
import type { DeliverNotificationParams } from "@/modules/ticketing/domain/services/notification-provider.interface";
import type { RaroNexusEmailClient, SendEmailOptions } from "@/server/infrastructure/clients/raronexus-email.client";

describe("RaroNexusNotificationProvider", () => {
  beforeEach(() => {
    process.env.RARONEXUS_API_URL = "http://nexus-mock.local";
    process.env.RARONEXUS_CLIENT_ID = "client-test-id";
    process.env.RARONEXUS_CLIENT_SECRET = "client-test-secret";
    process.env.APP_TIMEZONE = "America/Sao_Paulo";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza o body HTML corporativo e envia através do RaroNexusEmailClient", async () => {
    let capturedOptions: SendEmailOptions | null = null;

    const mockEmailClient = {
      send: vi.fn().mockImplementation((options) => {
        capturedOptions = options;
        return Promise.resolve({ sent: true, messageId: "<msg-999@nexus.local>" });
      }),
    } as unknown as RaroNexusEmailClient;

    const provider = new RaroNexusNotificationProvider(mockEmailClient);

    const params: DeliverNotificationParams = {
      message: {
        id: "msg-outbox-1",
        channel: "email",
        recipient: "participante@evento.com",
        subject: "Sua inscrição foi confirmada!",
        template: "registration-confirmed",
        attempts: 1,
        createdAt: new Date(),
        payload: {
          name: "Maria Silva",
          eventTitle: "Workshop de TypeScript",
          registrationCode: "INS-2026-TS01",
          participantUrl: "https://rarotickets.com.br/participante/INS-2026-TS01",
        },
      },
    };

    await provider.send(params);

    expect(mockEmailClient.send).toHaveBeenCalledTimes(1);
    expect(capturedOptions!.to).toBe("participante@evento.com");
    expect(capturedOptions!.subject).toBe("Sua inscrição foi confirmada!");
    expect(capturedOptions!.metadata).toEqual({
      outboxId: "msg-outbox-1",
      template: "registration-confirmed",
      channel: "email",
      registrationCode: "INS-2026-TS01",
    });
    // Verifica que o body contém o nome, o evento e o código da inscrição
    expect(capturedOptions!.body).toContain("Maria Silva");
    expect(capturedOptions!.body).toContain("Workshop de TypeScript");
    expect(capturedOptions!.body).toContain("INS-2026-TS01");
    // Não deve conter a tag de documento html externo completa pois vai dentro de {{body}} do Nexus
    expect(capturedOptions!.body).not.toContain("<!doctype html>");
  });
});

