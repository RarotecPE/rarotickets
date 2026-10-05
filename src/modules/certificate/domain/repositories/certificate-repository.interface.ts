import type { Certificate } from '../entities/certificate.entity';

export type CertificateFilter = {
  eventId?: string | null;
  participantId?: string | null;
  search?: string | null;
  page: number;
  perPage: number;
};
export type ListCertificatesResult = { certificates: Certificate[]; total: number };

export interface ICertificateRepository {
  findById(id: string): Promise<Certificate | null>;
  findByCode(code: string): Promise<Certificate | null>;
  findByRegistrationId(registrationId: string): Promise<Certificate | null>;
  list(filter: CertificateFilter): Promise<ListCertificatesResult>;
  listByEvent(eventId: string): Promise<Certificate[]>;
  save(certificate: Certificate): Promise<void>;
  update(certificate: Certificate): Promise<void>;
}

export const CERTIFICATE_REPOSITORY = Symbol('ICertificateRepository');
