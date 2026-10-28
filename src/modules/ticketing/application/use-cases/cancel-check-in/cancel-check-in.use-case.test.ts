import { describe, expect, it, vi, beforeEach } from "vitest";
import { CancelCheckInUseCase } from "./cancel-check-in.use-case";
import { Result } from "@/@core/domain/result";
import { CheckInRuleError } from "@/modules/ticketing/domain/services/check-in.domain-service";
import type { CheckInRepository } from "@/modules/ticketing/domain/repositories/checkin-repository.interface";
import type { IAuditRepository, AuditRecord } from "@/modules/ticketing/domain/repositories/audit-repository.interface";

describe("CancelCheckInUseCase", () => {
  let mockCheckInRepo: CheckInRepository;
  let mockAuditRepo: IAuditRepository;
  let auditLogs: AuditRecord[];
  let useCase: CancelCheckInUseCase;

  beforeEach(() => {
    auditLogs = [];

    mockCheckInRepo = {
      findContext: vi.fn(),
      create: vi.fn(),
      cancelCheckIn: vi.fn(),
    } as unknown as CheckInRepository;

    mockAuditRepo = {
      write: vi.fn(async (record: AuditRecord) => {
        auditLogs.push(record);
      }),
      list: vi.fn(),
    };

    useCase = new CancelCheckInUseCase({
      checkInRepository: mockCheckInRepo,
      auditRepository: mockAuditRepo,
    });
  });

  it("cancela check-in com sucesso e registra auditoria", async () => {
    const fakeResult = {
      registrationId: "reg-1",
      registrationCode: "INS-2026-0001",
      participantName: "Carlos Pereira",
      cancelledCheckInId: "ci-1",
      checkInType: "normal",
      happenedAt: new Date("2026-10-28T14:00:00Z"),
      operatorName: "Portaria 1",
    };

    vi.mocked(mockCheckInRepo.cancelCheckIn).mockResolvedValueOnce(
      Result.ok(fakeResult),
    );

    const result = await useCase.execute({
      registrationId: "reg-1",
      checkInId: "ci-1",
      reason: "Leitura indevida do QR code",
      userId: "admin-1",
      userName: "Admin User",
      canManageAll: true,
      ip: "127.0.0.1",
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({
      registrationCode: "INS-2026-0001",
      cancelledCheckInId: "ci-1",
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      action: "checkin.cancelled",
      recordId: "INS-2026-0001",
      userId: "admin-1",
    });
  });

  it("falha quando repositório rejeita o cancelamento", async () => {
    vi.mocked(mockCheckInRepo.cancelCheckIn).mockResolvedValueOnce(
      Result.fail(
        new CheckInRuleError({
          code: "REGISTRATION_NOT_CONFIRMED",
          message: "Apenas inscrições confirmadas permitem cancelar check-in.",
        }),
      ),
    );

    const result = await useCase.execute({
      registrationId: "reg-1",
      userId: "admin-1",
      userName: "Admin User",
      canManageAll: true,
      ip: "127.0.0.1",
    });

    expect(result.isFailure).toBe(true);
    expect(result.error.message).toBe(
      "Apenas inscrições confirmadas permitem cancelar check-in.",
    );
    expect(auditLogs).toHaveLength(0);
  });
});

