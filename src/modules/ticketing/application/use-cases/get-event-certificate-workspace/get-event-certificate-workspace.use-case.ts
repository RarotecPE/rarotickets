import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type {
  CertificateEventWorkspaceReadModel,
  CertificateRepository,
} from "@/modules/ticketing/domain/repositories/certificate-repository.interface";

export type GetEventCertificateWorkspaceInputDto = {
  eventId: string;
  userId: string;
  canViewAll: boolean;
};

export type GetEventCertificateWorkspaceOutputDto =
  CertificateEventWorkspaceReadModel;

export type GetEventCertificateWorkspaceDependencies = {
  certificateRepository: CertificateRepository;
};

export class GetEventCertificateWorkspaceUseCase extends UseCase<
  GetEventCertificateWorkspaceInputDto,
  GetEventCertificateWorkspaceOutputDto
> {
  private readonly certificateRepository: CertificateRepository;

  constructor(dependencies: GetEventCertificateWorkspaceDependencies) {
    super();
    this.certificateRepository = dependencies.certificateRepository;
  }

  async execute(
    input: GetEventCertificateWorkspaceInputDto,
  ): Promise<Result<GetEventCertificateWorkspaceOutputDto>> {
    const workspace = await this.certificateRepository.getEventWorkspace({
      eventId: input.eventId,
      actorId: input.userId,
      canViewAll: input.canViewAll,
    });
    if (!workspace) {
      return Result.fail(
        new Error("Evento não encontrado ou sem permissão para gerenciar certificados."),
      );
    }
    return Result.ok(workspace);
  }
}
