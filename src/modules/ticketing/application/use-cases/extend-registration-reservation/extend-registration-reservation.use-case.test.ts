import { describe, expect, it, vi, beforeEach } from "vitest";
import { ExtendRegistrationReservationUseCase } from "./extend-registration-reservation.use-case";
import { Result } from "@/@core/domain/result";
import { RegistrationRuleError } from "@/modules/ticketing/domain/registrations/entities/registration.aggregate";
import type { RegistrationRepository } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import type { IAuditRepository, AuditRecord } from "@/modules/ticketing/domain/repositories/audit-repository.interface";

describe("ExtendRegistrationReservationUseCase", () => {
  let mockRegistrationRepo: RegistrationRepository;
  let mockAuditRepo: IAuditRepository;
  let auditLogs: AuditRecord[];
  let useCase: ExtendRegistrationReservationUseCase;

  beforeEach(() => {
    auditLogs = [];

    mockRegistrationRepo = {
      extendReservation: vi.fn(),
    } as unknown as RegistrationRepository;

    mockAuditRepo = {
      write: vi.fn(async (record: AuditRecord) => {
        auditLogs.push(record);
      }),
      list: vi.fn(),
    };

    useCase = new ExtendRegistrationReservationUseCase({
      registrationRepository: mockRegistrationRepo,
      auditRepository: mockAuditRepo,
    });
  });

  it("deve estender a reserva e registrar na trilha de auditoria", async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const fakeResult = {
      registrationId: "reg-123",
      registrationCode: "INS-2026-0001",
      status: "aguardando_pagamento" as const,
      previousExpiresAt: new Date(Date.now() - 10000),
      newExpiresAt: futureDate,
      eventId: "event-1",
      participantName: "Carlos Pereira",
    };

    vi.mocked(mockRegistrationRepo.extendReservation).mockResolvedValueOnce(
      Result.ok(fakeResult),
    );

    const result = await useCase.execute({
      registrationId: "reg-123",
      expiresAt: futureDate,
      userId: "admin-1",
      userName: "Admin User",
      canManageAll: true,
      ip: "127.0.0.1",
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({
      registrationCode: "INS-2026-0001",
      status: "aguardando_pagamento",
      reservationExpiresAt: futureDate,
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      userId: "admin-1",
      userName: "Admin User",
      action: "registration.reservation_extended",
      recordId: "INS-2026-0001",
      ip: "127.0.0.1",
    });
  });

  it("deve falhar se a data de expiração for no passado", async () => {
    const pastDate = new Date(Date.now() - 60000);

    const result = await useCase.execute({
      registrationId: "reg-123",
      expiresAt: pastDate,
      userId: "admin-1",
      userName: "Admin User",
      canManageAll: true,
      ip: "127.0.0.1",
    });

    expect(result.isFailure).toBe(true);
    expect(result.error.message).toContain("futuro");
    expect(mockRegistrationRepo.extendReservation).not.toHaveBeenCalled();
    expect(auditLogs).toHaveLength(0);
  });

  it("deve propagar erro de regra de domínio retornado pelo repositório", async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    vi.mocked(mockRegistrationRepo.extendReservation).mockResolvedValueOnce(
      Result.fail(
        new RegistrationRuleError({
          code: "EVENT_CAPACITY_EXCEEDED",
          message: "Não há capacidade disponível no evento.",
        }),
      ),
    );

    const result = await useCase.execute({
      registrationId: "reg-123",
      expiresAt: futureDate,
      userId: "admin-1",
      userName: "Admin User",
      canManageAll: true,
      ip: "127.0.0.1",
    });

    expect(result.isFailure).toBe(true);
    expect(result.error.message).toBe("Não há capacidade disponível no evento.");
    expect(auditLogs).toHaveLength(0);
  });
});

