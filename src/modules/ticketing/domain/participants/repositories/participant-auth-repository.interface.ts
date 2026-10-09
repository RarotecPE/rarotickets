import type { RegistrationStatus } from "../../registrations/entities/registration.aggregate";

export type ParticipantAuthRecord = {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string;
  birthDate: Date | null;
  company: string | null;
  jobTitle: string | null;
  passwordHash: string | null;
  status: string;
  termsConsent: boolean;
  marketingConsent: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type SaveActivationTokenParams = {
  id?: string;
  email: string;
  cpf: string | null;
  tokenHash: string;
  expiresAt: Date;
};

export type ActivationTokenRecord = {
  id: string;
  email: string;
  cpf: string | null;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export type SaveOtpTokenParams = {
  email: string;
  cpf: string | null;
  code: string;
  tokenHash: string;
  expiresAt: Date;
  participantId?: string | null;
};

export type OtpTokenRecord = {
  id: string;
  email: string;
  cpf: string | null;
  code: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export type UpsertActiveParticipantParams = {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  birthDate?: Date | null;
  company?: string | null;
  jobTitle?: string | null;
  passwordHash: string;
  termsConsent: boolean;
  marketingConsent?: boolean;
};

export type ParticipantEventItem = {
  registrationId: string;
  registrationCode: string;
  status: RegistrationStatus;
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  eventStartAt: Date;
  eventEndAt: Date;
  modality: string;
  onlineUrl: string | null;
  location: string | null;
  lotName: string | null;
  finalCents: number;
  accessToken: string;
  reservationExpiresAt: Date | null;
  waitlistExpiresAt: Date | null;
  checkoutUrl: string | null;
  certificateCode: string | null;
  certificateIssuedAt: Date | null;
};

export interface ParticipantAuthRepository {
  findByEmail(email: string): Promise<ParticipantAuthRecord | null>;
  findByCpf(cpf: string): Promise<ParticipantAuthRecord | null>;
  findById(id: string): Promise<ParticipantAuthRecord | null>;
  saveActivationToken(params: SaveActivationTokenParams): Promise<void>;
  findActivationToken(tokenHash: string): Promise<ActivationTokenRecord | null>;
  markTokenUsed(id: string): Promise<void>;
  saveOtpToken(params: SaveOtpTokenParams): Promise<void>;
  findActiveOtpToken(params: { email: string; code: string }): Promise<OtpTokenRecord | null>;
  upsertActiveParticipant(params: UpsertActiveParticipantParams): Promise<ParticipantAuthRecord>;
  listParticipantEvents(participantId: string): Promise<ParticipantEventItem[]>;
}

