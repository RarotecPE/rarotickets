import type { Certificate } from '../entities/certificate.entity';
import type {
  CertificateFilter,
  ICertificateRepository,
  ListCertificatesResult,
} from './certificate-repository.interface';

export abstract class CertificateRepository implements ICertificateRepository {
  abstract findById(id: string): Promise<Certificate | null>;
  abstract findByCode(code: string): Promise<Certificate | null>;
  abstract findByRegistrationId(registrationId: string): Promise<Certificate | null>;
  abstract list(filter: CertificateFilter): Promise<ListCertificatesResult>;
  abstract listByEvent(eventId: string): Promise<Certificate[]>;
  abstract save(certificate: Certificate): Promise<void>;
  abstract update(certificate: Certificate): Promise<void>;
}
