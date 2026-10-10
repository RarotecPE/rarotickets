import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ParticipantEmailProvider } from "./participant-email.provider";
import type { IFileStorageProvider } from "@/modules/ticketing/domain/services/file-storage-provider.interface";
import type {
  RaroNexusEmailClient,
  SendEmailOptions,
} from "../clients/raronexus-email.client";

describe("ParticipantEmailProvider", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      APP_TIMEZONE: "America/Sao_Paulo",
      RARONEXUS_EMAIL_ENDPOINT_PAYMENT_CONFIRMED: "confirmacao-pagamento-custom",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("salva o QR Code no storage público e envia o e-mail com a URL pública no HTML e anexo", async () => {
    let capturedOptions: SendEmailOptions | null = null;
    const mockClient = {
      send: vi.fn().mockImplementation((options: SendEmailOptions) => {
        capturedOptions = options;
        return Promise.resolve({ sent: true, messageId: "msg-123" });
      }),
    } as unknown as RaroNexusEmailClient;

    const mockFileStorage = {
      storePublic: vi
        .fn()
        .mockResolvedValue(
          "https://cdn.rarotickets.com.br/rarotickets/public/credentials/qr-RT-2026-ABCD12.png",
        ),
      storePrivate: vi.fn(),
      read: vi.fn(),
      delete: vi.fn(),
    } as unknown as IFileStorageProvider;

    const provider = new ParticipantEmailProvider(mockClient, mockFileStorage);

    await provider.sendPaymentConfirmedEmail({
      email: "participante@teste.com",
      participantName: "João da Silva",
      registrationCode: "RT-2026-ABCD12",
      eventTitle: "Congresso RaroTech 2026",
      eventStartAt: new Date("2026-11-15T12:00:00.000Z"),
      modality: "presencial",
      location: "Av. Paulista, 1000, São Paulo, SP",
      lotName: "1º Lote",
      originalCents: 15000,
      discountCents: 3000,
      finalCents: 12000,
      paymentProvider: "pagbank",
      paymentExternalId: "CHAR_123456789",
      paidAt: new Date("2026-10-10T13:30:00.000Z"),
      qrPayload: "RARO-QR.payload.signature",
      participantUrl: "http://localhost:3005/ingressos/token-acesso",
    });

    expect(mockFileStorage.storePublic).toHaveBeenCalledTimes(1);
    expect(mockFileStorage.storePublic).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "public/credentials/qr-RT-2026-ABCD12.png",
        contentType: "image/png",
      }),
    );

    expect(mockClient.send).toHaveBeenCalledTimes(1);
    expect(capturedOptions).not.toBeNull();
    expect(capturedOptions!.to).toBe("participante@teste.com");
    expect(capturedOptions!.endpoint).toBe("confirmacao-pagamento-custom");
    expect(capturedOptions!.subject).toContain("Congresso RaroTech 2026");
    expect(capturedOptions!.subject).toContain("RT-2026-ABCD12");
    expect(capturedOptions!.body).toContain("João da Silva");
    expect(capturedOptions!.body).toContain("RT-2026-ABCD12");
    expect(capturedOptions!.body).toContain("1º Lote");
    expect(capturedOptions!.body).toContain("PagBank");
    expect(capturedOptions!.body).toContain("CHAR_123456789");
    expect(capturedOptions!.body).toContain(
      'src="https://cdn.rarotickets.com.br/rarotickets/public/credentials/qr-RT-2026-ABCD12.png"',
    );
    expect(capturedOptions!.attachments).toHaveLength(1);
    expect(capturedOptions!.attachments![0].filename).toBe(
      "credencial-RT-2026-ABCD12.png",
    );
    expect(capturedOptions!.attachments![0].contentType).toBe("image/png");
    expect(capturedOptions!.attachments![0].contentBase64.length).toBeGreaterThan(50);
    expect(capturedOptions!.metadata).toMatchObject({
      registrationCode: "RT-2026-ABCD12",
      participantName: "João da Silva",
      eventTitle: "Congresso RaroTech 2026",
      finalCents: 12000,
      paymentProvider: "pagbank",
      paymentExternalId: "CHAR_123456789",
      qrPayload: "RARO-QR.payload.signature",
      qrCodeUrl:
        "https://cdn.rarotickets.com.br/rarotickets/public/credentials/qr-RT-2026-ABCD12.png",
    });
  });

  it("envia e-mail de promoção da lista de espera para pendente em evento pago com prazo e valor", async () => {
    let capturedOptions: SendEmailOptions | null = null;
    const mockClient = {
      send: vi.fn().mockImplementation((options: SendEmailOptions) => {
        capturedOptions = options;
        return Promise.resolve({ sent: true, messageId: "msg-waitlist-paid" });
      }),
    } as unknown as RaroNexusEmailClient;

    const mockFileStorage = {
      storePublic: vi.fn(),
      storePrivate: vi.fn(),
      read: vi.fn(),
      delete: vi.fn(),
    } as unknown as IFileStorageProvider;

    const provider = new ParticipantEmailProvider(mockClient, mockFileStorage);

    await provider.sendWaitlistPromotedEmail({
      email: "fila@teste.com",
      participantName: "Maria Oliveira",
      registrationCode: "RT-2026-WAIT01",
      eventTitle: "Summit Arquitetura 2026",
      eventStartAt: new Date("2026-12-01T12:00:00.000Z"),
      modality: "presencial",
      location: "Belo Horizonte, MG",
      lotName: "2º Lote",
      status: "pendente",
      amountCents: 18000,
      waitlistExpiresAt: new Date("2026-10-11T15:00:00.000Z"),
      participantUrl: "http://localhost:3005/ingressos/token-fila-1",
    });

    expect(mockFileStorage.storePublic).not.toHaveBeenCalled();
    expect(mockClient.send).toHaveBeenCalledTimes(1);
    expect(capturedOptions).not.toBeNull();
    expect(capturedOptions!.to).toBe("fila@teste.com");
    expect(capturedOptions!.subject).toContain("Vaga liberada na lista de espera");
    expect(capturedOptions!.subject).toContain("Summit Arquitetura 2026");
    expect(capturedOptions!.body).toContain("Maria Oliveira");
    expect(capturedOptions!.body).toContain("Pendente (Aguardando pagamento)");
    expect(capturedOptions!.body).toContain("Acessar Inscrição e Realizar Pagamento");
    expect(capturedOptions!.attachments).toBeUndefined();
  });

  it("envia e-mail de promoção da lista de espera para confirmada em evento gratuito com QR Code", async () => {
    let capturedOptions: SendEmailOptions | null = null;
    const mockClient = {
      send: vi.fn().mockImplementation((options: SendEmailOptions) => {
        capturedOptions = options;
        return Promise.resolve({ sent: true, messageId: "msg-waitlist-free" });
      }),
    } as unknown as RaroNexusEmailClient;

    const mockFileStorage = {
      storePublic: vi
        .fn()
        .mockResolvedValue(
          "https://cdn.rarotickets.com.br/rarotickets/public/credentials/qr-RT-2026-FREE01.png",
        ),
      storePrivate: vi.fn(),
      read: vi.fn(),
      delete: vi.fn(),
    } as unknown as IFileStorageProvider;

    const provider = new ParticipantEmailProvider(mockClient, mockFileStorage);

    await provider.sendWaitlistPromotedEmail({
      email: "gratis@teste.com",
      participantName: "Carlos Souza",
      registrationCode: "RT-2026-FREE01",
      eventTitle: "Meetup Open Source",
      eventStartAt: new Date("2026-12-05T22:00:00.000Z"),
      modality: "online",
      onlineUrl: "https://meet.rarotickets.com.br/sala-1",
      status: "confirmada",
      amountCents: 0,
      qrPayload: "RARO-QR.free.signature",
      participantUrl: "http://localhost:3005/ingressos/token-free-1",
    });

    expect(mockFileStorage.storePublic).toHaveBeenCalledTimes(1);
    expect(mockClient.send).toHaveBeenCalledTimes(1);
    expect(capturedOptions).not.toBeNull();
    expect(capturedOptions!.to).toBe("gratis@teste.com");
    expect(capturedOptions!.subject).toContain(
      "Vaga liberada e inscrição confirmada",
    );
    expect(capturedOptions!.body).toContain("Carlos Souza");
    expect(capturedOptions!.body).toContain("Gratuito");
    expect(capturedOptions!.body).toContain(
      'src="https://cdn.rarotickets.com.br/rarotickets/public/credentials/qr-RT-2026-FREE01.png"',
    );
    expect(capturedOptions!.attachments).toHaveLength(1);
    expect(capturedOptions!.attachments![0].filename).toBe(
      "credencial-RT-2026-FREE01.png",
    );
  });
});

