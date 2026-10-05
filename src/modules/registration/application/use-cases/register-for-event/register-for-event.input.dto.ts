export type RegisterParticipantInput = {
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
};

export type RegisterAnswerInput = { fieldKey: string; value: string | null };

export type RegisterForEventInputDto = {
  eventSlug?: string | null;
  eventId?: string | null;
  participant: RegisterParticipantInput;
  answers: RegisterAnswerInput[];
  consents: { termsVersion: string; privacyVersion: string; marketingAccepted: boolean };
  couponCode?: string | null;
  isCourtesy?: boolean;
  courtesyReason?: string | null;
  allowAdministrativeOverride?: boolean;
  actorUserId?: string | null;
  actorName?: string | null;
  ip?: string | null;
};
