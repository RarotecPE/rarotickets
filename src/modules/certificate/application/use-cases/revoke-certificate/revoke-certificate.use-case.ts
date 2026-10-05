import { UseCase } from '@core/application/use-case.base';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { Result } from '@core/domain/result';
import { CertificateNotFoundError } from '../../../domain/errors/certificate-not-found.error';
import { CERTIFICATE_REPOSITORY } from '../../../domain/repositories/certificate-repository.interface';
import type { ICertificateRepository } from '../../../domain/repositories/certificate-repository.interface';
import { CertificateMapper } from '../../mappers/certificate.mapper';
import type { RevokeCertificateInputDto } from './revoke-certificate.input.dto';
import type { RevokeCertificateOutputDto } from './revoke-certificate.output.dto';

export type RevokeCertificateDependencies = {
  certificateRepository: ICertificateRepository;
  auditRecorder: IAuditRecorder;
  clock: IClock;
  mapper: CertificateMapper;
};

export class RevokeCertificateUseCase extends UseCase<RevokeCertificateInputDto, RevokeCertificateOutputDto> {
  private readonly dependencies: RevokeCertificateDependencies;

  constructor(dependencies: RevokeCertificateDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: RevokeCertificateInputDto): Promise<Result<RevokeCertificateOutputDto>> {
    const { certificateRepository, auditRecorder, clock, mapper } = this.dependencies;

    const certificate = await certificateRepository.findById(input.certificateId);
    if (!certificate) return Result.fail(new CertificateNotFoundError(input.certificateId));

    const result = certificate.cancel({ at: clock.now(), reason: input.reason });
    if (result.isFailure) return Result.fail(result.error);

    await certificateRepository.update(certificate);
    await auditRecorder.record({
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? 'Operador',
      action: 'CERTIFICATE_REVOKED',
      entity: 'certificate',
      entityId: certificate.id.toString(),
      description: `Certificado ${certificate.code.value} cancelado`,
      before: { status: 'EMITIDO' },
      after: { status: certificate.status, reason: input.reason },
      ip: input.ip ?? null,
    });

    return Result.ok({ certificate: mapper.map({ certificate }) });
  }
}
