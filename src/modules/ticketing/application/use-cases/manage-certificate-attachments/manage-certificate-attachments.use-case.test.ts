import { describe, expect, it, vi } from "vitest";
import {
  DeleteCertificateAttachmentUseCase,
  UploadCertificateAttachmentUseCase,
} from "./manage-certificate-attachments.use-case";
import {
  DEFAULT_CERTIFICATE_EMAIL_CONFIG,
  DEFAULT_CERTIFICATE_LAYOUT_CONFIG,
  DEFAULT_CERTIFICATE_SELECTION_CONFIG,
  type CertificateEmailExtraAttachment,
} from "@/modules/ticketing/domain/certificates/services/certificate-text.domain-service";
import type { IIdGenerator } from "@/@core/domain/id-generator.interface";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import type {
  CertificateEventWorkspaceReadModel,
  CertificateRepository,
} from "@/modules/ticketing/domain/repositories/certificate-repository.interface";
import type { IFileStorageProvider } from "@/modules/ticketing/domain/services/file-storage-provider.interface";

function createWorkspace(
  extraAttachments: CertificateEmailExtraAttachment[] = [],
): CertificateEventWorkspaceReadModel {
  return {
    event: {
      id: "evt-1",
      title: "Evento Teste",
      slug: "evento-teste",
      modality: "presencial",
      startAt: new Date(),
      endAt: new Date(),
      status: "finalizado",
      workloadHours: 8,
      certificateDescription: "Descrição",
      responsibleName: "Resp",
      responsibleEmail: "resp@teste.com",
      workflowStatus: "pendente",
      templatePdfKey: null,
      templatePdfName: null,
    },
    layoutConfig: DEFAULT_CERTIFICATE_LAYOUT_CONFIG,
    emailConfig: {
      ...DEFAULT_CERTIFICATE_EMAIL_CONFIG,
      extraAttachments,
    },
    selectionConfig: DEFAULT_CERTIFICATE_SELECTION_CONFIG,
    recipients: [],
    availableVariables: [],
    presets: [],
  };
}

describe("manage-certificate-attachments use cases", () => {
  it("armazena anexo extra válido e salva no workspace", async () => {
    const saveEventWorkspace = vi.fn().mockResolvedValue(createWorkspace());
    const certificateRepository = {
      getEventWorkspace: vi.fn().mockResolvedValue(createWorkspace()),
      saveEventWorkspace,
    } as unknown as CertificateRepository;
    const fileStorageProvider = {
      storePrivate: vi.fn().mockResolvedValue(undefined),
      storePublic: vi.fn(),
      read: vi.fn(),
      delete: vi.fn(),
    } as unknown as IFileStorageProvider;
    const idGenerator: IIdGenerator = { next: () => "att-1" };
    const auditRepository = {
      write: vi.fn().mockResolvedValue(undefined),
    } as unknown as IAuditRepository;

    const useCase = new UploadCertificateAttachmentUseCase({
      certificateRepository,
      fileStorageProvider,
      idGenerator,
      auditRepository,
    });

    const content = new Uint8Array([1, 2, 3, 4]);
    const result = await useCase.execute({
      eventId: "evt-1",
      userId: "user-1",
      userName: "Admin",
      canViewAll: true,
      mimeType: "application/pdf",
      sizeBytes: content.byteLength,
      originalName: "Apostila do Curso.pdf",
      content,
      ip: "127.0.0.1",
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.attachment).toEqual({
      id: "att-1",
      key: "private/certificate-attachments/evt-1/att-1.pdf",
      filename: "Apostila do Curso.pdf",
      contentType: "application/pdf",
      sizeBytes: 4,
    });
    expect(result.value.extraAttachments).toHaveLength(1);
    expect(fileStorageProvider.storePrivate).toHaveBeenCalledTimes(1);
    expect(saveEventWorkspace).toHaveBeenCalledTimes(1);
  });

  it("bloqueia arquivos executáveis", async () => {
    const useCase = new UploadCertificateAttachmentUseCase({
      certificateRepository: {} as CertificateRepository,
      fileStorageProvider: {} as IFileStorageProvider,
      idGenerator: { next: () => "att-2" },
      auditRepository: {} as IAuditRepository,
    });

    const content = new Uint8Array([1, 2, 3]);
    const result = await useCase.execute({
      eventId: "evt-1",
      userId: "user-1",
      userName: "Admin",
      canViewAll: true,
      mimeType: "application/octet-stream",
      sizeBytes: content.byteLength,
      originalName: "malware.exe",
      content,
      ip: null,
    });

    expect(result.isFailure).toBe(true);
  });

  it("remove anexo existente do workspace e do storage", async () => {
    const existing: CertificateEmailExtraAttachment = {
      id: "att-1",
      key: "private/certificate-attachments/evt-1/att-1.pdf",
      filename: "Apostila.pdf",
      contentType: "application/pdf",
      sizeBytes: 1024,
    };
    const saveEventWorkspace = vi.fn().mockResolvedValue(createWorkspace([]));
    const certificateRepository = {
      getEventWorkspace: vi.fn().mockResolvedValue(createWorkspace([existing])),
      saveEventWorkspace,
    } as unknown as CertificateRepository;
    const deleteFile = vi.fn().mockResolvedValue(undefined);
    const fileStorageProvider = {
      storePrivate: vi.fn(),
      storePublic: vi.fn(),
      read: vi.fn(),
      delete: deleteFile,
    } as unknown as IFileStorageProvider;
    const auditRepository = {
      write: vi.fn().mockResolvedValue(undefined),
    } as unknown as IAuditRepository;

    const useCase = new DeleteCertificateAttachmentUseCase({
      certificateRepository,
      fileStorageProvider,
      auditRepository,
    });

    const result = await useCase.execute({
      eventId: "evt-1",
      userId: "user-1",
      userName: "Admin",
      canViewAll: true,
      attachmentId: "att-1",
      ip: "127.0.0.1",
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.deleted).toBe(true);
    expect(result.value.extraAttachments).toEqual([]);
    expect(deleteFile).toHaveBeenCalledWith({ key: existing.key });
  });
});
