export type CertificateReadModel = {
  id: string;
  authenticationCode: string;
  participantName: string;
  eventTitle: string;
  eventStartAt: Date;
  workloadHours: number;
  description: string;
  issuedAt: Date;
};
export type CreateCertificatesParams = { eventId: string; actorId: string; canViewAll: boolean; at: Date };
export type CertificateBatchResult = { created: number; existing: number };
export type ValidateCertificateParams = { code: string };

export interface ICertificateRepository {
  issueEligible(params: CreateCertificatesParams): Promise<CertificateBatchResult>;
  findByCode(params: ValidateCertificateParams): Promise<CertificateReadModel | null>;
  findForRegistration(params: { registrationId: string }): Promise<CertificateReadModel | null>;
}

export abstract class CertificateRepository implements ICertificateRepository {
  abstract issueEligible(params: CreateCertificatesParams): Promise<CertificateBatchResult>;
  abstract findByCode(params: ValidateCertificateParams): Promise<CertificateReadModel | null>;
  abstract findForRegistration(params: { registrationId: string }): Promise<CertificateReadModel | null>;
}
