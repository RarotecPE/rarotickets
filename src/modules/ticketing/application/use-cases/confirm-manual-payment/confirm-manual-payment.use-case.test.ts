import { describe, expect, it, vi, beforeEach } from "vitest";
import { ConfirmManualPaymentUseCase } from "./confirm-manual-payment.use-case";
import type { RegistrationRepository } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import type { IAuditRepository, AuditRecord } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import type { ICredentialProvider } from "@/modules/ticketing/domain/services/credential-provider.interface";
import type { IOutboxRepository } from "@/modules/ticketing/domain/repositories/outbox-repository.interface";
import type { IParticipantEmailSender } from "@/modules/ticketing/domain/services/participant-email-sender.interface";

describe("ConfirmManualPaymentUseCase", () => {
  let mockRegistrationRepo: RegistrationRepository;
  let mockAuditRepo: IAuditRepository;
  let mockCredentialProvider: ICredentialProvider;
  let mockOutboxRepo: IOutboxRepository;
  let mockEmailSender: IParticipantEmailSender;
  let auditLogs: AuditRecord[];
  let outboxQueue: unknown[];
  let useCase: ConfirmManualPaymentUseCase;

  beforeEach(() => {
    auditLogs = [];
    outboxQueue = [];

    mockRegistrationRepo = {
      confirmManualPayment: vi.fn(),
    } as unknown as RegistrationRepository;

    mockAuditRepo = {
      write: vi.fn(async (record: AuditRecord) => {
        auditLogs.push(record);
      }),
      list: vi.fn(),
    };

    mockCredentialProvider = {
      issueAccessToken: vi.fn(() => ({
        rawToken: "token-abc-123",
        tokenHash: "hash-abc-123",
      })),
      createQrToken: vi.fn(() => "qr-payload-xyz"),
    } as unknown as ICredentialProvider;

    mockOutboxRepo = {
      enqueue: vi.fn(async (entry) => {
        outboxQueue.push(entry);
      }),
    } as unknown as IOutboxRepository;

    mockEmailSender = {
      sendPaymentConfirmedEmail: vi.fn(async () => {}),
    } as unknown as IParticipantEmailSender;

    useCase = new ConfirmManualPaymentUseCase({
      registrationRepository: mockRegistrationRepo,
      auditRepository: mockAuditRepo,
      credentialProvider: mockCredentialProvider,
      outboxRepository: mockOutboxRepo,
      emailSender: mockEmailSender,
      publicBaseUrl: "https://rarotickets.com.br",
    });
  });

  it("deve confirmar o pagamento manual com sucesso e disparar notificações/auditoria", async () => {
    const fakeResult = {
      registrationId: "reg-1",
      registrationCode: "REG-2026-001",
      eventId: "event-1",
      status: "confirmada" as const,
      participantName: "Maria da Silva",
      participantEmail: "maria@teste.com",
      eventTitle: "Conferência Raro 2026",
      eventStartAt: new Date("2026-11-20T10:00:00Z"),
      eventEndAt: new Date("2026-11-20T18:00:00Z"),
      modality: "presencial",
      location: "Belo Horizonte, MG",
      onlineUrl: null,
      lotName: "Lote 1",
      originalCents: 15000,
      discountCents: 0,
      finalCents: 15000,
      paymentProvider: "pix_manual",
      paymentExternalId: "MANUAL-REG-2026-001",
      paidAt: new Date("2026-10-13T12:00:00Z"),
    };

    vi.mocked(mockRegistrationRepo.confirmManualPayment).mockResolvedValueOnce(fakeResult);

    const result = await useCase.execute({
      registrationId: "reg-1",
      userId: "admin-1",
      userName: "Administrador Geral",
      canManageAll: true,
      ip: "127.0.0.1",
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({
      registrationCode: "REG-2026-001",
      status: "confirmada",
    });

    expect(mockRegistrationRepo.confirmManualPayment).toHaveBeenCalledWith({
      registrationId: "reg-1",
      actorId: "admin-1",
      canManageAll: true,
      at: expect.any(Date),
    });

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].action).toBe("payment.manual_confirmed");
    expect(auditLogs[0].entity).toBe("registration");
    expect(auditLogs[0].recordId).toBe("REG-2026-001");

    expect(mockCredentialProvider.issueAccessToken).toHaveBeenCalledWith({
      registrationId: "reg-1",
    });
    expect(mockEmailSender.sendPaymentConfirmedEmail).toHaveBeenCalledTimes(1);
    expect(outboxQueue).toHaveLength(1);
  });

  it("deve retornar falha quando a inscrição não for encontrada ou não puder ser confirmada", async () => {
    vi.mocked(mockRegistrationRepo.confirmManualPayment).mockResolvedValueOnce(null);

    const result = await useCase.execute({
      registrationId: "invalid-reg",
      userId: "admin-1",
      userName: "Administrador Geral",
      canManageAll: true,
      ip: null,
    });

    expect(result.isFailure).toBe(true);
    expect(result.error.message).toContain("Inscrição não encontrada");
    expect(auditLogs).toHaveLength(0);
    expect(outboxQueue).toHaveLength(0);
    expect(mockEmailSender.sendPaymentConfirmedEmail).not.toHaveBeenCalled();
  });
});
