export type ResolveParticipantConsentInput = {
  type: string;
  version: string;
  accepted: boolean;
};

export type ResolveParticipantInputDto = {
  name: string;
  email: string;
  cpf?: string | null;
  cnpj?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  city?: string | null;
  state?: string | null;
  consents?: ResolveParticipantConsentInput[];
  ip?: string | null;
};
