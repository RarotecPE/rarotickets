import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { IIdGenerator } from "@/@core/domain/id-generator.interface";
import { CertificateTemplateFileDomainService } from "@/modules/ticketing/domain/certificates/services/certificate-template-file.domain-service";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import type { CertificateRepository } from "@/modules/ticketing/domain/repositories/certificate-repository.interface";
import type { IFileStorageProvider } from "@/modules/ticketing/domain/services/file-storage-provider.interface";

export type UploadCertificateTemplateInputDto = {
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

export type UploadCertificateTemplateOutputDto = {
  templatePdfKey: string;
  templatePdfName: string;
};

export type UploadCertificateTemplateDependencies = {
  certificateRepository: CertificateRepository;
  fileStorageProvider: IFileStorageProvider;
  idGenerator: IIdGenerator;
  templateValidator: CertificateTemplateFileDomainService;
  auditRepository: IAuditRepository;
};

export class UploadCertificateTemplateUseCase extends UseCase<
  UploadCertificateTemplateInputDto,
  UploadCertificateTemplateOutputDto
> {
  private readonly certificateRepository: CertificateRepository;
  private readonly fileStorageProvider: IFileStorageProvider;
  private readonly idGenerator: IIdGenerator;
  private readonly templateValidator: CertificateTemplateFileDomainService;
  private readonly auditRepository: IAuditRepository;

  constructor(dependencies: UploadCertificateTemplateDependencies) {
    super();
    this.certificateRepository = dependencies.certificateRepository;
    this.fileStorageProvider = dependencies.fileStorageProvider;
    this.idGenerator = dependencies.idGenerator;
    this.templateValidator = dependencies.templateValidator;
    this.auditRepository = dependencies.auditRepository;
  }

  async execute(
    input: UploadCertificateTemplateInputDto,
  ): Promise<Result<UploadCertificateTemplateOutputDto>> {
    const validation = this.templateValidator.execute({
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      originalName: input.originalName,
      content: input.content,
    });
    if (validation.isFailure) return Result.fail(validation.error);

    const workspace = await this.certificateRepository.getEventWorkspace({
      eventId: input.eventId,
      actorId: input.userId,
      canViewAll: input.canViewAll,
    });
    if (!workspace) {
      return Result.fail(
        new Error("Evento não encontrado ou sem permissão para anexar modelo PDF."),
      );
    }

    const key = `private/certificate-templates/${input.eventId}/${this.idGenerator.next()}.pdf`;
    await this.fileStorageProvider.storePrivate({
      key,
      contentType: validation.value.mimeType,
      content: input.content,
    });

    await this.certificateRepository.saveEventWorkspace({
      eventId: input.eventId,
      actorId: input.userId,
      canViewAll: input.canViewAll,
      templatePdfKey: key,
      templatePdfName: validation.value.sanitizedName,
      at: new Date(),
    });

    await this.auditRepository.write({
      userId: input.userId,
      userName: input.userName,
      action: "certificates.template_uploaded",
      entity: "event",
      recordId: input.eventId,
      beforeData: null,
      afterData: {
        templatePdfKey: key,
        templatePdfName: validation.value.sanitizedName,
        sizeBytes: input.sizeBytes,
      },
      ip: input.ip,
    });

    return Result.ok({
      templatePdfKey: key,
      templatePdfName: validation.value.sanitizedName,
    });
  }
}

export type GetCertificateTemplatePdfInputDto = {
  eventId: string;
  userId: string;
  canViewAll: boolean;
  templatePdfKey?: string;
};

export type GetCertificateTemplatePdfOutputDto = {
  content: Uint8Array;
  contentType: string;
  filename: string;
};

export type GetCertificateTemplatePdfDependencies = {
  certificateRepository: CertificateRepository;
  fileStorageProvider: IFileStorageProvider;
};

export class GetCertificateTemplatePdfUseCase extends UseCase<
  GetCertificateTemplatePdfInputDto,
  GetCertificateTemplatePdfOutputDto
> {
  private readonly certificateRepository: CertificateRepository;
  private readonly fileStorageProvider: IFileStorageProvider;

  constructor(dependencies: GetCertificateTemplatePdfDependencies) {
    super();
    this.certificateRepository = dependencies.certificateRepository;
    this.fileStorageProvider = dependencies.fileStorageProvider;
  }

  async execute(
    input: GetCertificateTemplatePdfInputDto,
  ): Promise<Result<GetCertificateTemplatePdfOutputDto>> {
    const workspace = await this.certificateRepository.getEventWorkspace({
      eventId: input.eventId,
      actorId: input.userId,
      canViewAll: input.canViewAll,
    });
    if (!workspace) {
      return Result.fail(new Error("Evento não encontrado."));
    }

    const key = input.templatePdfKey || workspace.event.templatePdfKey;
    if (!key) {
      return Result.fail(
        new Error("Este evento ainda não possui modelo PDF anexado."),
      );
    }

    const stored = await this.fileStorageProvider.read({ key });
    if (!stored) {
      return Result.fail(
        new Error("O arquivo PDF do modelo não foi localizado no armazenamento."),
      );
    }

    return Result.ok({
      content: stored.content,
      contentType: stored.contentType || "application/pdf",
      filename: workspace.event.templatePdfName || "modelo-certificado.pdf",
    });
  }
}

