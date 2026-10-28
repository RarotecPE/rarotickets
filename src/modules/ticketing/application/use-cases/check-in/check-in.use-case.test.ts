import { describe, expect, it, vi, beforeEach } from "vitest";
import { CheckInUseCase } from "./check-in.use-case";
import { CheckInDomainService } from "@/modules/ticketing/domain/services/check-in.domain-service";
import type { CheckInRepository, CheckInContext, CheckInResult } from "@/modules/ticketing/domain/repositories/checkin-repository.interface";
import type { ICredentialProvider } from "@/modules/ticketing/domain/services/credential-provider.interface";
import type { IAuditRepository, AuditRecord } from "@/modules/ticketing/domain/repositories/audit-repository.interface";

describe("CheckInUseCase", () => {
  let mockCheckInRepo: CheckInRepository;
  let mockCredentialProvider: ICredentialProvider;
  let mockAuditRepo: IAuditRepository;
  let auditLogs: AuditRecord[];
  let useCase: CheckInUseCase;

  const fakeContext: CheckInContext = {
    registrationId: "reg-1",
    registrationCode: "INS-2026-ABCD12",
    registrationStatus: "confirmada",
    eventId: "event-1",
    eventTitle: "Tech Conference 2026",
    eventStatus: "em_andamento",
    eventStartAt: new Date("2026-10-28T09:00:00Z"),
    eventEndAt: new Date("2026-10-28T18:00:00Z"),
    eventDayMatches: true,
    participantName: "Carlos Pereira",
    alreadyCheckedIn: false,
    previousCheckInAt: null,
    previousCheckInBy: null,
  };

  const fakeCreateResult: CheckInResult = {
    accepted: true,
    registrationCode: "INS-2026-ABCD12",
    participantName: "Carlos Pereira",
    eventTitle: "Tech Conference 2026",
    happenedAt: new Date("2026-10-28T14:00:00Z"),
    operatorName: "Portaria 1",
    reason: null,
    previousCheckInAt: null,
  };

  beforeEach(() => {
    auditLogs = [];

    mockCheckInRepo = {
      findContext: vi.fn().mockResolvedValue(fakeContext),
      create: vi.fn().mockResolvedValue(fakeCreateResult),
      cancelCheckIn: vi.fn(),
    } as unknown as CheckInRepository;

    mockCredentialProvider = {
      issueAccessToken: vi.fn(),
      issueRegistrationCode: vi.fn(),
      issueCertificateCode: vi.fn(),
      createQrToken: vi.fn(),
      verifyQrToken: vi.fn((params: { token: string }) => {
        if (params.token.startsWith("RT1.valid")) return "reg-1";
        return null;
      }),
      hashToken: vi.fn(),
    };

    mockAuditRepo = {
      write: vi.fn(async (record: AuditRecord) => {
        auditLogs.push(record);
      }),
      list: vi.fn(),
    };

    useCase = new CheckInUseCase({
      checkInRepository: mockCheckInRepo,
      credentialProvider: mockCredentialProvider,
      auditRepository: mockAuditRepo,
      checkInDomainService: new CheckInDomainService(),
    });
  });

  it("realiza check-in pelo código da inscrição (enviado por e-mail)", async () => {
    const result = await useCase.execute({
      registrationCode: "ins-2026-abcd12",
      operatorId: "op-1",
      operatorName: "Operador Portaria",
      canReenter: false,
      supervisorReentry: false,
      ip: "127.0.0.1",
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.accepted).toBe(true);
    expect(result.value.registrationCode).toBe("INS-2026-ABCD12");

    expect(mockCheckInRepo.findContext).toHaveBeenCalledWith(
      expect.objectContaining({
        registrationCode: "INS-2026-ABCD12",
      }),
    );
    expect(mockCheckInRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        registrationId: "reg-1",
        operatorName: "Operador Portaria",
        type: "normal",
      }),
    );
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      action: "checkin.created",
      recordId: "INS-2026-ABCD12",
      afterData: expect.objectContaining({
        method: "code",
      }),
    });
  });

  it("realiza check-in quando o código da inscrição é digitado no campo qrToken (auto-detecção)", async () => {
    const result = await useCase.execute({
      qrToken: "INS-2026-ABCD12",
      operatorId: "op-1",
      operatorName: "Operador Portaria",
      canReenter: false,
      supervisorReentry: false,
      ip: "127.0.0.1",
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.accepted).toBe(true);
    expect(mockCheckInRepo.findContext).toHaveBeenCalledWith(
      expect.objectContaining({
        registrationCode: "INS-2026-ABCD12",
      }),
    );
  });

  it("realiza check-in via QR Code criptográfico", async () => {
    const result = await useCase.execute({
      qrToken: "RT1.valid.payload.sig",
      operatorId: "op-1",
      operatorName: "Operador Portaria",
      canReenter: false,
      supervisorReentry: false,
      ip: "127.0.0.1",
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.accepted).toBe(true);
    expect(mockCheckInRepo.findContext).toHaveBeenCalledWith(
      expect.objectContaining({
        registrationId: "reg-1",
      }),
    );
    expect(auditLogs[0]).toMatchObject({
      action: "checkin.created",
      afterData: expect.objectContaining({
        method: "qr",
      }),
    });
  });

  it("rejeita QR Code com formato RT1. adulterado", async () => {
    const result = await useCase.execute({
      qrToken: "RT1.invalid.payload.badsig",
      operatorId: "op-1",
      operatorName: "Operador Portaria",
      canReenter: false,
      supervisorReentry: false,
      ip: "127.0.0.1",
    });

    expect(result.isFailure).toBe(true);
    expect(result.error.message).toBe("QR Code inválido ou adulterado.");
  });

  it("rejeita quando código de inscrição não existe no banco", async () => {
    vi.mocked(mockCheckInRepo.findContext).mockResolvedValueOnce(null);

    const result = await useCase.execute({
      registrationCode: "INS-9999-NOTFOUND",
      operatorId: "op-1",
      operatorName: "Operador Portaria",
      canReenter: false,
      supervisorReentry: false,
      ip: "127.0.0.1",
    });

    expect(result.isFailure).toBe(true);
    expect(result.error.message).toBe(
      'Inscrição não encontrada para o código "INS-9999-NOTFOUND".',
    );
  });

  it("rejeita check-in para inscrição não confirmada", async () => {
    vi.mocked(mockCheckInRepo.findContext).mockResolvedValueOnce({
      ...fakeContext,
      registrationStatus: "pendente",
    });

    const result = await useCase.execute({
      registrationCode: "INS-2026-ABCD12",
      operatorId: "op-1",
      operatorName: "Operador Portaria",
      canReenter: false,
      supervisorReentry: false,
      ip: "127.0.0.1",
    });

    expect(result.isFailure).toBe(true);
    expect(result.error.message).toBe("A inscrição ainda não está confirmada.");
  });

  it("rejeita check-in duplicado sem autorização de reentrada", async () => {
    vi.mocked(mockCheckInRepo.findContext).mockResolvedValueOnce({
      ...fakeContext,
      alreadyCheckedIn: true,
      previousCheckInAt: new Date("2026-10-28T10:00:00Z"),
      previousCheckInBy: "Portaria 1",
    });

    const result = await useCase.execute({
      registrationCode: "INS-2026-ABCD12",
      operatorId: "op-1",
      operatorName: "Operador Portaria",
      canReenter: false,
      supervisorReentry: false,
      ip: "127.0.0.1",
    });

    expect(result.isFailure).toBe(true);
    expect(result.error.message).toBe("Check-in já realizado para esta inscrição.");
  });
});

