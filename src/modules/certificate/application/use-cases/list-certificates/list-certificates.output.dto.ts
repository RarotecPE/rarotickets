import type { PaginationMeta } from '@core/application/pagination/pagination';
import type { CertificateDto } from '../../mappers/certificate.mapper';

export type ListCertificatesOutputDto = { certificates: CertificateDto[]; meta: PaginationMeta };
