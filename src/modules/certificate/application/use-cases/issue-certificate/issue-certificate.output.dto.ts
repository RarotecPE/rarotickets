import type { CertificateDto } from '../../mappers/certificate.mapper';

export type IssueCertificateOutputDto = { certificate: CertificateDto; alreadyIssued: boolean };
