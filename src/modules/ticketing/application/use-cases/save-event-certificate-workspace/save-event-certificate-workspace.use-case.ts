import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type {
  CertificateEmailConfig,
  CertificateLayoutConfig,
  CertificateSelectionConfig,
  CertificateWorkflowStatus,
} from "@/modules/ticketing/domain/certificates/services/certificate-text.domain-service";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import type {
  CertificateEventWorkspaceReadModel,
  CertificateRepository,
} from "@/modules/ticketing/domain/repositories/certificate-repository.interface";

export type SaveEventCertificateWorkspaceInputDto = {
  eventId: string;
  userId: string;
  userName: string;
  canViewAll: boolean;
  workloadHours?: number;
  certificateDescription?: string;
  templatePdfKey?: string | null;
  templatePdfName?: string | null;
  layoutConfig?: CertificateLayoutConfig;
  emailConfig?: CertificateEmailConfig;
  selectionConfig?: CertificateSelectionConfig;
  workflowStatus?: CertificateWorkflowStatus;
  issueBatch?: boolean;
  resetEmailStatuses?: boolean;
  ip: string | null;
};

export type SaveEventCertificateWorkspaceOutputDto =
  CertificateEventWorkspaceReadModel;

export type SaveEventCertificateWorkspaceDependencies = {
  certificateRepository: CertificateRepository;
  auditRepository: IAuditRepository;
};

export class SaveEventCertificateWorkspaceUseCase extends UseCase<
  SaveEventCertificateWorkspaceInputDto,
  SaveEventCertificateWorkspaceOutputDto
> {
  private readonly certificateRepository: CertificateRepository;
  private readonly auditRepository: IAuditRepository;

  constructor(dependencies: SaveEventCertificateWorkspaceDependencies) {
    super();
    this.certificateRepository = dependencies.certificateRepository;
    this.auditRepository = dependencies.auditRepository;
  }

  async execute(
    input: SaveEventCertificateWorkspaceInputDto,
  ): Promise<Result<SaveEventCertificateWorkspaceOutputDto>> {
    const now = new Date();

    if (input.resetEmailStatuses) {
      await this.certificateRepository.resetEventEmailStatuses({
        eventId: input.eventId,
        actorId: input.userId,
        canViewAll: input.canViewAll,
        at: now,
      });
    }

    let workspace = await this.certificateRepository.saveEventWorkspace({
      eventId: input.eventId,
      actorId: input.userId,
      canViewAll: input.canViewAll,
      workloadHours: input.workloadHours,
      certificateDescription: input.certificateDescription,
      templatePdfKey: input.templatePdfKey,
      templatePdfName: input.templatePdfName,
      layoutConfig: input.layoutConfig,
      emailConfig: input.emailConfig,
      selectionConfig: input.selectionConfig,
      workflowStatus: input.workflowStatus,
      at: now,
    });

    if (!workspace) {
      return Result.fail(
        new Error("Evento não encontrado ou sem permissão para salvar configuração."),
      );
    }

    if (input.issueBatch) {
      workspace =
        (await this.certificateRepository.issueWorkspaceBatch({
          eventId: input.eventId,
          actorId: input.userId,
          canViewAll: input.canViewAll,
          at: now,
        })) ?? workspace;

      await this.auditRepository.write({
        userId: input.userId,
        userName: input.userName,
        action: "certificates.batch_issued",
        entity: "event",
        recordId: input.eventId,
        beforeData: null,
        afterData: {
          selectedCount: workspace.recipients.filter((r) => r.selected).length,
          issuedCount: workspace.recipients.filter((r) => Boolean(r.authenticationCode)).length,
        },
        ip: input.ip,
      });
    } else {
      await this.auditRepository.write({
        userId: input.userId,
        userName: input.userName,
        action: "certificates.workspace_saved",
        entity: "event",
        recordId: input.eventId,
        beforeData: null,
        afterData: {
          workloadHours: workspace.event.workloadHours,
          workflowStatus: workspace.event.workflowStatus,
        },
        ip: input.ip,
      });
    }

    return Result.ok(workspace);
  }
}
