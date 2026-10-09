import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { CertificateReadModel, CertificateRepository } from "@/modules/ticketing/domain/repositories/certificate-repository.interface";

export type ValidateCertificateInputDto = { code: string };
export type ValidateCertificateOutputDto = CertificateReadModel | null;
export type ValidateCertificateDependencies = { certificateRepository: CertificateRepository };

export class ValidateCertificateUseCase extends UseCase<ValidateCertificateInputDto, ValidateCertificateOutputDto> {
  private readonly certificateRepository: CertificateRepository;
  constructor(dependencies: ValidateCertificateDependencies) {
    super();
    this.certificateRepository = dependencies.certificateRepository;
  }
  async execute(input: ValidateCertificateInputDto): Promise<Result<ValidateCertificateOutputDto>> {
    return Result.ok(await this.certificateRepository.findByCode({ code: input.code.trim().toUpperCase() }));
  }
}
