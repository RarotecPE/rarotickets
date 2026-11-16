import { describe, expect, it, vi } from "vitest";
import { UpdateEventCertificateStatusUseCase } from "./update-event-certificate-status.use-case";
import type { CertificateRepository } from "@/modules/ticketing/domain/repositories/certificate-repository.interface";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";

describe("UpdateEventCertificateStatusUseCase", () => {
  it("marca um evento como dispensado ('Não precisa de certificado'), permite reverter para pendente e registra auditoria", async () => {
    const updateMock = vi.fn().mockImplementation(async (params) => ({
      eventId: params.eventId,
      title: "Seminário de Gestão",
      slug: "seminario-gestao",
      modality: "presencial",
      startAt: new Date("2026-10-01T12:00:00Z"),
      endAt: new Date("2026-10-01T18:00:00Z"),
      workloadHours: 8,
      workflowStatus: params.workflowStatus,
      templatePdfName: null,
      hasCustomTemplate: false,
      confirmedCount: 25,
      checkedInCount: 20,
      issuedCount: 0,
      sentCount: 0,
      failedCount: 0,
      updatedAt: params.at,
    }));

    const writeAuditMock = vi.fn().mockResolvedValue(undefined);

    const certificateRepository = {
      updateEventWorkflowStatus: updateMock,
    } as unknown as CertificateRepository;

    const auditRepository = {
      write: writeAuditMock,
    } as unknown as IAuditRepository;

    const useCase = new UpdateEventCertificateStatusUseCase({
      certificateRepository,
      auditRepository,
    });

    const dismissed = await useCase.execute({
      eventId: "ev-1",
      userId: "user-1",
      userName: "Admin",
      canViewAll: true,
      workflowStatus: "dispensado",
      ip: "127.0.0.1",
    });

    expect(dismissed.isSuccess).toBe(true);
    expect(dismissed.value.workflowStatus).toBe("dispensado");
    expect(writeAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "certificates.event_dismissed",
        recordId: "ev-1",
      }),
    );

    const reopened = await useCase.execute({
      eventId: "ev-1",
      userId: "user-1",
      userName: "Admin",
      canViewAll: true,
      workflowStatus: "pendente",
      ip: "127.0.0.1",
    });

    expect(reopened.isSuccess).toBe(true);
    expect(reopened.value.workflowStatus).toBe("pendente");
    expect(writeAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "certificates.event_reopened",
        recordId: "ev-1",
      }),
    );
  });
});
