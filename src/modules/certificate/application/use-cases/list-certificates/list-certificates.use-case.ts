import { buildPaginationMeta, normalizePagination } from '@core/application/pagination/pagination';
import { UseCase } from '@core/application/use-case.base';
import { Result } from '@core/domain/result';
import { CERTIFICATE_REPOSITORY } from '../../../domain/repositories/certificate-repository.interface';
import type { ICertificateRepository } from '../../../domain/repositories/certificate-repository.interface';
import { CertificateMapper } from '../../mappers/certificate.mapper';
import type { ListCertificatesInputDto } from './list-certificates.input.dto';
import type { ListCertificatesOutputDto } from './list-certificates.output.dto';

export type ListCertificatesDependencies = { certificateRepository: ICertificateRepository; mapper: CertificateMapper };

export class ListCertificatesUseCase extends UseCase<ListCertificatesInputDto, ListCertificatesOutputDto> {
  private readonly dependencies: ListCertificatesDependencies;

  constructor(dependencies: ListCertificatesDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: ListCertificatesInputDto): Promise<Result<ListCertificatesOutputDto>> {
    const pagination = normalizePagination({ page: input.page, perPage: input.perPage });
    const { certificates, total } = await this.dependencies.certificateRepository.list({
      eventId: input.eventId ?? null,
      participantId: input.participantId ?? null,
      search: input.search ?? null,
      page: pagination.page,
      perPage: pagination.perPage,
    });

    return Result.ok({
      certificates: certificates.map((certificate) => this.dependencies.mapper.map({ certificate })),
      meta: buildPaginationMeta({ ...pagination, total }),
    });
  }
}
