export type CertificateListQuery = {
  eventId?: string;
  participantId?: string;
  search?: string;
  page?: string;
  perPage?: string;
};

export type CertificateActionRequest =
  | { action: 'validate'; code: string }
  | { action: 'detail'; code: string }
  | { action: 'mine' }
  | { action: 'list'; query: CertificateListQuery }
  | { action: 'issue'; registrationId: string }
  | { action: 'revoke'; certificateId: string; body: { reason?: string } };
