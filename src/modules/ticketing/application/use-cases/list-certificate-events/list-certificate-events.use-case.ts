import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type {
  CertificateHubReadModel,
  CertificateRepository,
} from "@/modules/ticketing/domain/repositories/certificate-repository.interface";

export type ListCertificateEventsInputDto = {
  userId: string;
  canViewAll: boolean;
  query?: string;
};

export type ListCertificateEventsOutputDto = CertificateHubReadModel;

export type ListCertificateEventsDependencies = {
  certificateRepository: CertificateRepository;
};

export class ListCertificateEventsUseCase extends UseCase<
  ListCertificateEventsInputDto,
  ListCertificateEventsOutputDto
> {
  private readonly certificateRepository: CertificateRepository;

  constructor(dependencies: ListCertificateEventsDependencies) {
    super();
    this.certificateRepository = dependencies.certificateRepository;
  }

  async execute(
    input: ListCertificateEventsInputDto,
  ): Promise<Result<ListCertificateEventsOutputDto>> {
    const hub = await this.certificateRepository.listCertificateHub({
      actorId: input.userId,
      canViewAll: input.canViewAll,
      query: input.query,
    });
    return Result.ok(hub);
  }
}
