export type ParticipantModel = {
  id: string;
  name: string;
  cpf: string | null;
  cnpj: string | null;
  email: string;
  phone: string | null;
  birth_date: Date | null;
  company: string | null;
  job_title: string | null;
  city: string | null;
  state: string | null;
  created_at: Date;
  updated_at: Date;
};

export type ParticipantModelData = ParticipantModel;

export type ParticipantConsentModel = {
  id: string;
  participant_id: string;
  type: string;
  version: string;
  accepted: boolean;
  accepted_at: Date | null;
  ip: string | null;
  created_at: Date;
};

export type ParticipantConsentModelData = ParticipantConsentModel;

export type ParticipantSessionModel = {
  id: string;
  participant_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
};
