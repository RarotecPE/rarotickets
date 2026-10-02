import type { Result } from '../../../../@core/domain/result.ts';
import type { DomainError } from '../../../../@core/domain/domain-error.base.ts';
import type { Certificate } from '../entities/certificate.entity.ts';

export type CertificateId = string;
export type CertificateByRegistrationParams = { registrationId: string };
export type CertificateByCodeParams = { validationCode: string };
export type CreateCertificateIfUniqueParams = { certificate: Certificate };

export interface ICertificateRepository {
  findById(id: CertificateId): Promise<Certificate | null>;
  findByRegistration(params: CertificateByRegistrationParams): Promise<Certificate | null>;
  findByValidationCode(params: CertificateByCodeParams): Promise<Certificate | null>;
  createIfUnique(params: CreateCertificateIfUniqueParams): Promise<Result<Certificate, DomainError>>;
  save(certificate: Certificate): Promise<Result<void, DomainError>>;
}
