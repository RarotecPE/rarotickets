import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { CertificateWorkflowStatus } from "@/modules/ticketing/domain/certificates/services/certificate-text.domain-service";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import type {
  CertificateEventSummaryReadModel,
  CertificateRepository,
} from "@/modules/ticketing/domain/repositories/certificate-repository.interface";

export type UpdateEventCertificateStatusInputDto = {
  eventId: string;
  userId: string;
  userName: string;
  canViewAll: boolean;
  workflowStatus: CertificateWorkflowStatus;
  ip: string | null;
};

export type UpdateEventCertificateStatusOutputDto =
  CertificateEventSummaryReadModel;

export type UpdateEventCertificateStatusDependencies = {
  certificateRepository: CertificateRepository;
  auditRepository: IAuditRepository;
};

export class UpdateEventCertificateStatusUseCase extends UseCase<
  UpdateEventCertificateStatusInputDto,
  UpdateEventCertificateStatusOutputDto
> {
  private readonly certificateRepository: CertificateRepository;
  private readonly auditRepository: IAuditRepository;

  constructor(dependencies: UpdateEventCertificateStatusDependencies) {
    super();
    this.certificateRepository = dependencies.certificateRepository;
    this.auditRepository = dependencies.auditRepository;
  }

  async execute(
    input: UpdateEventCertificateStatusInputDto,
  ): Promise<Result<UpdateEventCertificateStatusOutputDto>> {
    if (
      input.workflowStatus !== "pendente" &&
      input.workflowStatus !== "dispensado" &&
      input.workflowStatus !== "concluido"
    ) {
      return Result.fail(
        new Error("Status de certificação inválido para o evento."),
      );
    }

    const updated = await this.certificateRepository.updateEventWorkflowStatus({
      eventId: input.eventId,
      actorId: input.userId,
      canViewAll: input.canViewAll,
      workflowStatus: input.workflowStatus,
      at: new Date(),
    });

    if (!updated) {
      return Result.fail(
        new Error("Evento não encontrado ou sem permissão de acesso."),
      );
    }

    await this.auditRepository.write({
      userId: input.userId,
      userName: input.userName,
      action:
        input.workflowStatus === "dispensado"
          ? "certificates.event_dismissed"
          : input.workflowStatus === "concluido"
            ? "certificates.event_completed"
            : "certificates.event_reopened",
      entity: "event",
      recordId: input.eventId,
      beforeData: null,
      afterData: { workflowStatus: input.workflowStatus },
      ip: input.ip,
    });

    return Result.ok(updated);
  }
}
