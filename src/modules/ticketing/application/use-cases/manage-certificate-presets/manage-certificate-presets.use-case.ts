import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type {
  CertificateEmailConfig,
  CertificateLayoutConfig,
} from "@/modules/ticketing/domain/certificates/services/certificate-text.domain-service";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import type {
  CertificatePresetReadModel,
  CertificateRepository,
} from "@/modules/ticketing/domain/repositories/certificate-repository.interface";

export type CreateCertificatePresetInputDto = {
  userId: string;
  userName: string;
  name: string;
  templatePdfKey?: string | null;
  templatePdfName?: string | null;
  layoutConfig: CertificateLayoutConfig;
  emailConfig?: CertificateEmailConfig | null;
  workloadHoursDefault?: number | null;
  ip: string | null;
};

export type CreateCertificatePresetOutputDto = CertificatePresetReadModel;

export type DeleteCertificatePresetInputDto = {
  presetId: string;
  userId: string;
  userName: string;
  canViewAll: boolean;
  ip: string | null;
};

export type DeleteCertificatePresetOutputDto = { deleted: boolean };

export type ManageCertificatePresetsDependencies = {
  certificateRepository: CertificateRepository;
  auditRepository: IAuditRepository;
};

export class CreateCertificatePresetUseCase extends UseCase<
  CreateCertificatePresetInputDto,
  CreateCertificatePresetOutputDto
> {
  private readonly certificateRepository: CertificateRepository;
  private readonly auditRepository: IAuditRepository;

  constructor(dependencies: ManageCertificatePresetsDependencies) {
    super();
    this.certificateRepository = dependencies.certificateRepository;
    this.auditRepository = dependencies.auditRepository;
  }

  async execute(
    input: CreateCertificatePresetInputDto,
  ): Promise<Result<CreateCertificatePresetOutputDto>> {
    if (!input.name.trim() || input.name.trim().length > 140) {
      return Result.fail(
        new Error("Informe um nome válido (até 140 caracteres) para o modelo."),
      );
    }

    const preset = await this.certificateRepository.createPreset({
      name: input.name.trim(),
      templatePdfKey: input.templatePdfKey,
      templatePdfName: input.templatePdfName,
      layoutConfig: input.layoutConfig,
      emailConfig: input.emailConfig,
      workloadHoursDefault: input.workloadHoursDefault,
      createdByGlobalUserId: input.userId,
      at: new Date(),
    });

    await this.auditRepository.write({
      userId: input.userId,
      userName: input.userName,
      action: "certificates.preset_created",
      entity: "certificate_preset",
      recordId: preset.id,
      beforeData: null,
      afterData: { name: preset.name },
      ip: input.ip,
    });

    return Result.ok(preset);
  }
}

export class DeleteCertificatePresetUseCase extends UseCase<
  DeleteCertificatePresetInputDto,
  DeleteCertificatePresetOutputDto
> {
  private readonly certificateRepository: CertificateRepository;
  private readonly auditRepository: IAuditRepository;

  constructor(dependencies: ManageCertificatePresetsDependencies) {
    super();
    this.certificateRepository = dependencies.certificateRepository;
    this.auditRepository = dependencies.auditRepository;
  }

  async execute(
    input: DeleteCertificatePresetInputDto,
  ): Promise<Result<DeleteCertificatePresetOutputDto>> {
    const deleted = await this.certificateRepository.deletePreset({
      presetId: input.presetId,
      actorId: input.userId,
      canViewAll: input.canViewAll,
    });
    if (!deleted) {
      return Result.fail(
        new Error("Não foi possível excluir este modelo salvo."),
      );
    }

    await this.auditRepository.write({
      userId: input.userId,
      userName: input.userName,
      action: "certificates.preset_deleted",
      entity: "certificate_preset",
      recordId: input.presetId,
      beforeData: null,
      afterData: null,
      ip: input.ip,
    });

    return Result.ok({ deleted: true });
  }
}
