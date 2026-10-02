import type { Result } from '../../../../@core/domain/result.ts';
import type { DomainError } from '../../../../@core/domain/domain-error.base.ts';
import type { Certificate } from '../entities/certificate.entity.ts';
import type {
  CertificateByCodeParams,
  CertificateByRegistrationParams,
  CertificateId,
  CreateCertificateIfUniqueParams,
  ICertificateRepository,
} from './certificate-repository.interface.ts';

export abstract class CertificateRepository implements ICertificateRepository {
  abstract findById(id: CertificateId): Promise<Certificate | null>;
  abstract findByRegistration(params: CertificateByRegistrationParams): Promise<Certificate | null>;
  abstract findByValidationCode(params: CertificateByCodeParams): Promise<Certificate | null>;
  abstract createIfUnique(params: CreateCertificateIfUniqueParams): Promise<Result<Certificate, DomainError>>;
  abstract save(certificate: Certificate): Promise<Result<void, DomainError>>;
}
