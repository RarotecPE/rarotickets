import { UseCase } from '@core/application/use-case.base';
import { Result } from '@core/domain/result';
import { CertificateNotFoundError } from '../../../domain/errors/certificate-not-found.error';
import { CERTIFICATE_REPOSITORY } from '../../../domain/repositories/certificate-repository.interface';
import type { ICertificateRepository } from '../../../domain/repositories/certificate-repository.interface';
import { CertificateMapper } from '../../mappers/certificate.mapper';
import type { GetCertificateInputDto } from './get-certificate.input.dto';
import type { GetCertificateOutputDto } from './get-certificate.output.dto';

export type GetCertificateDependencies = { certificateRepository: ICertificateRepository; mapper: CertificateMapper };

export class GetCertificateUseCase extends UseCase<GetCertificateInputDto, GetCertificateOutputDto> {
  private readonly dependencies: GetCertificateDependencies;

  constructor(dependencies: GetCertificateDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: GetCertificateInputDto): Promise<Result<GetCertificateOutputDto>> {
    const { certificateRepository, mapper } = this.dependencies;

    const certificate = input.certificateId
      ? await certificateRepository.findById(input.certificateId)
      : input.code
        ? await certificateRepository.findByCode(input.code)
        : input.registrationId
          ? await certificateRepository.findByRegistrationId(input.registrationId)
          : null;
    if (!certificate) {
      return Result.fail(new CertificateNotFoundError(input.code ?? input.certificateId ?? input.registrationId ?? ''));
    }

    return Result.ok({ certificate: mapper.map({ certificate }) });
  }
}
