import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { IIdGenerator } from "@/@core/domain/id-generator.interface";
import {
  MAX_CERTIFICATE_EXTRA_ATTACHMENTS,
  MAX_CERTIFICATE_EXTRA_ATTACHMENT_SIZE_BYTES,
  MAX_CERTIFICATE_EXTRA_ATTACHMENTS_TOTAL_BYTES,
  type CertificateEmailExtraAttachment,
} from "@/modules/ticketing/domain/certificates/services/certificate-text.domain-service";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import type { CertificateRepository } from "@/modules/ticketing/domain/repositories/certificate-repository.interface";
import type { IFileStorageProvider } from "@/modules/ticketing/domain/services/file-storage-provider.interface";

const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "com",
  "msi",
  "scr",
  "pif",
  "vbs",
  "js",
  "mjs",
  "cjs",
  "sh",
  "ps1",
  "dll",
]);

export type UploadCertificateAttachmentInputDto = {
  eventId: string;
  userId: string;
  userName: string;
  canViewAll: boolean;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
  content: Uint8Array;
  ip: string | null;
};

export type UploadCertificateAttachmentOutputDto = {
  attachment: CertificateEmailExtraAttachment;
  extraAttachments: CertificateEmailExtraAttachment[];
};

export type UploadCertificateAttachmentDependencies = {
  certificateRepository: CertificateRepository;
  fileStorageProvider: IFileStorageProvider;
  idGenerator: IIdGenerator;
  auditRepository: IAuditRepository;
};

export class UploadCertificateAttachmentUseCase extends UseCase<
  UploadCertificateAttachmentInputDto,
  UploadCertificateAttachmentOutputDto
> {
  private readonly certificateRepository: CertificateRepository;
  private readonly fileStorageProvider: IFileStorageProvider;
  private readonly idGenerator: IIdGenerator;
  private readonly auditRepository: IAuditRepository;

  constructor(dependencies: UploadCertificateAttachmentDependencies) {
    super();
    this.certificateRepository = dependencies.certificateRepository;
    this.fileStorageProvider = dependencies.fileStorageProvider;
    this.idGenerator = dependencies.idGenerator;
    this.auditRepository = dependencies.auditRepository;
  }

  async execute(
    input: UploadCertificateAttachmentInputDto,
  ): Promise<Result<UploadCertificateAttachmentOutputDto>> {
    if (
      input.sizeBytes <= 0 ||
      input.content.byteLength !== input.sizeBytes
    ) {
      return Result.fail(new Error("O arquivo selecionado está vazio ou inválido."));
    }

    if (input.sizeBytes > MAX_CERTIFICATE_EXTRA_ATTACHMENT_SIZE_BYTES) {
      return Result.fail(new Error("Cada anexo deve ter no máximo 10 MB."));
    }

    const sanitizedName = sanitizeAttachmentFilename(input.originalName);
    const ext = extractExtension(sanitizedName);
    if (ext && BLOCKED_EXTENSIONS.has(ext)) {
      return Result.fail(new Error("Este tipo de arquivo não é permitido como anexo."));
    }

    const workspace = await this.certificateRepository.getEventWorkspace({
      eventId: input.eventId,
      actorId: input.userId,
      canViewAll: input.canViewAll,
    });
    if (!workspace) {
      return Result.fail(
        new Error("Evento não encontrado ou sem permissão para anexar arquivos."),
      );
    }

    const currentAttachments = workspace.emailConfig.extraAttachments ?? [];
    if (currentAttachments.length >= MAX_CERTIFICATE_EXTRA_ATTACHMENTS) {
      return Result.fail(
        new Error(
          `Limite máximo de ${MAX_CERTIFICATE_EXTRA_ATTACHMENTS} anexos extras atingido.`,
        ),
      );
    }

    const currentTotalBytes = currentAttachments.reduce(
      (acc, item) => acc + (item.sizeBytes || 0),
      0,
    );
    if (
      currentTotalBytes + input.sizeBytes >
      MAX_CERTIFICATE_EXTRA_ATTACHMENTS_TOTAL_BYTES
    ) {
      return Result.fail(
        new Error("O tamanho total dos anexos extras não pode ultrapassar 20 MB."),
      );
    }

    const id = this.idGenerator.next();
    const safeStorageExt = ext && /^[a-z0-9]{1,10}$/.test(ext) ? `.${ext}` : "";
    const key = `private/certificate-attachments/${input.eventId}/${id}${safeStorageExt}`;
    const contentType = sanitizeContentType(input.mimeType);

    await this.fileStorageProvider.storePrivate({
      key,
      contentType,
      content: input.content,
    });

    const attachment: CertificateEmailExtraAttachment = {
      id,
      key,
      filename: sanitizedName,
      contentType,
      sizeBytes: input.sizeBytes,
    };

    const nextAttachments = [...currentAttachments, attachment];

    await this.certificateRepository.saveEventWorkspace({
      eventId: input.eventId,
      actorId: input.userId,
      canViewAll: input.canViewAll,
      emailConfig: {
        ...workspace.emailConfig,
        extraAttachments: nextAttachments,
      },
      at: new Date(),
    });

    await this.auditRepository.write({
      userId: input.userId,
      userName: input.userName,
      action: "certificates.attachment_uploaded",
      entity: "event",
      recordId: input.eventId,
      beforeData: null,
      afterData: {
        attachmentId: id,
        filename: sanitizedName,
        contentType,
        sizeBytes: input.sizeBytes,
      },
      ip: input.ip,
    });

    return Result.ok({
      attachment,
      extraAttachments: nextAttachments,
    });
  }
}

export type DeleteCertificateAttachmentInputDto = {
  eventId: string;
  userId: string;
  userName: string;
  canViewAll: boolean;
  attachmentId: string;
  ip: string | null;
};

export type DeleteCertificateAttachmentOutputDto = {
  deleted: boolean;
  extraAttachments: CertificateEmailExtraAttachment[];
};

export type DeleteCertificateAttachmentDependencies = {
  certificateRepository: CertificateRepository;
  fileStorageProvider: IFileStorageProvider;
  auditRepository: IAuditRepository;
};

export class DeleteCertificateAttachmentUseCase extends UseCase<
  DeleteCertificateAttachmentInputDto,
  DeleteCertificateAttachmentOutputDto
> {
  private readonly certificateRepository: CertificateRepository;
  private readonly fileStorageProvider: IFileStorageProvider;
  private readonly auditRepository: IAuditRepository;

  constructor(dependencies: DeleteCertificateAttachmentDependencies) {
    super();
    this.certificateRepository = dependencies.certificateRepository;
    this.fileStorageProvider = dependencies.fileStorageProvider;
    this.auditRepository = dependencies.auditRepository;
  }

  async execute(
    input: DeleteCertificateAttachmentInputDto,
  ): Promise<Result<DeleteCertificateAttachmentOutputDto>> {
    const attachmentId = input.attachmentId.trim();
    if (!attachmentId) {
      return Result.fail(new Error("Identificador do anexo ausente."));
    }

    const workspace = await this.certificateRepository.getEventWorkspace({
      eventId: input.eventId,
      actorId: input.userId,
      canViewAll: input.canViewAll,
    });
    if (!workspace) {
      return Result.fail(
        new Error("Evento não encontrado ou sem permissão para remover anexos."),
      );
    }

    const currentAttachments = workspace.emailConfig.extraAttachments ?? [];
    const target = currentAttachments.find((item) => item.id === attachmentId);
    if (!target) {
      return Result.fail(new Error("Anexo não encontrado."));
    }

    const nextAttachments = currentAttachments.filter(
      (item) => item.id !== attachmentId,
    );

    await this.certificateRepository.saveEventWorkspace({
      eventId: input.eventId,
      actorId: input.userId,
      canViewAll: input.canViewAll,
      emailConfig: {
        ...workspace.emailConfig,
        extraAttachments: nextAttachments,
      },
      at: new Date(),
    });

    try {
      await this.fileStorageProvider.delete({ key: target.key });
    } catch {
      // Ignora erro de limpeza no storage caso o objeto já tenha sido removido
    }

    await this.auditRepository.write({
      userId: input.userId,
      userName: input.userName,
      action: "certificates.attachment_deleted",
      entity: "event",
      recordId: input.eventId,
      beforeData: {
        attachmentId: target.id,
        filename: target.filename,
      },
      afterData: null,
      ip: input.ip,
    });

    return Result.ok({
      deleted: true,
      extraAttachments: nextAttachments,
    });
  }
}

function sanitizeAttachmentFilename(originalName: string): string {
  const cleaned = (originalName || "")
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ");

  if (!cleaned) return "anexo";
  if (cleaned.length <= 140) return cleaned;

  const dotIdx = cleaned.lastIndexOf(".");
  if (dotIdx > 0 && cleaned.length - dotIdx <= 12) {
    const ext = cleaned.slice(dotIdx);
    return `${cleaned.slice(0, 140 - ext.length)}${ext}`;
  }
  return cleaned.slice(0, 140);
}

function extractExtension(filename: string): string {
  const dotIdx = filename.lastIndexOf(".");
  if (dotIdx <= 0 || dotIdx === filename.length - 1) return "";
  return filename.slice(dotIdx + 1).toLowerCase();
}

function sanitizeContentType(mimeType: string): string {
  const trimmed = (mimeType || "").trim().toLowerCase().slice(0, 100);
  return trimmed || "application/octet-stream";
}
