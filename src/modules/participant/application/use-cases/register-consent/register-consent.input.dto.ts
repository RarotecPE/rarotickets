export type RegisterConsentInputDto = {
  participantId: string;
  consents: Array<{ type: string; version: string; accepted: boolean }>;
  ip?: string | null;
};
