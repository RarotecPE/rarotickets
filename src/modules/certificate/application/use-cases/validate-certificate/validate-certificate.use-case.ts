import { UseCase } from '@core/application/use-case.base';
import { Result } from '@core/domain/result';
import { CERTIFICATE_REPOSITORY } from '../../../domain/repositories/certificate-repository.interface';
import type { ICertificateRepository } from '../../../domain/repositories/certificate-repository.interface';
import type { ValidateCertificateInputDto } from './validate-certificate.input.dto';
import type { ValidateCertificateOutputDto } from './validate-certificate.output.dto';

export type ValidateCertificateDependencies = { certificateRepository: ICertificateRepository };

/** Consulta pública de autenticidade do certificado (§31). */
export class ValidateCertificateUseCase extends UseCase<
  ValidateCertificateInputDto,
  ValidateCertificateOutputDto
> {
  private readonly dependencies: ValidateCertificateDependencies;

  constructor(dependencies: ValidateCertificateDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: ValidateCertificateInputDto): Promise<Result<ValidateCertificateOutputDto>> {
    const certificate = await this.dependencies.certificateRepository.findByCode(input.code.trim().toUpperCase());

    if (!certificate) {
      return Result.ok({
        valid: false,
        code: input.code.trim().toUpperCase(),
        status: 'NAO_ENCONTRADO',
        participantName: null,
        eventTitle: null,
        workloadHours: 0,
        issuedAt: null,
        cancelledAt: null,
        message: 'Código de certificado não encontrado',
      });
    }

    return Result.ok({
      valid: certificate.isIssued(),
      code: certificate.code.value,
      status: certificate.status,
      participantName: certificate.participantName,
      eventTitle: certificate.eventTitle,
      workloadHours: certificate.workloadHours,
      issuedAt: certificate.issuedAt,
      cancelledAt: certificate.cancelledAt,
      message: certificate.isIssued() ? 'Certificado autêntico' : `Certificado cancelado: ${certificate.cancelReason ?? 'sem motivo informado'}`,
    });
  }
}
