export type UpdateParticipantInputDto = {
  participantId: string;
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
  actorUserId: string;
  actorName: string;
  ip?: string | null;
};
