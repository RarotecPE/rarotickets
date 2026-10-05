export type ParticipantSnapshot = {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  cnpj: string | null;
  phone: string | null;
  birthDate: string | null;
  company: string | null;
  jobTitle: string | null;
  city: string | null;
  state: string | null;
  createdAt: Date;
};

export type FindParticipantParams = {
  cpf?: string | null;
  email?: string | null;
};

export type CreateParticipantFromRegistrationParams = {
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
  consent?: {
    termsVersion: string;
    privacyVersion: string;
    marketingAccepted: boolean;
    ip?: string | null;
  } | null;
};

export type UpdateParticipantProfileParams = CreateParticipantFromRegistrationParams & { id: string };

export type ParticipantGatewayResult =
  | { status: 'FOUND'; participant: ParticipantSnapshot }
  | { status: 'CREATED'; participant: ParticipantSnapshot }
  | { status: 'INVALID'; message: string };

/** Anti-Corruption Layer entre inscrições e o contexto de participantes. */
export interface IParticipantGateway {
  findByDocumentOrEmail(params: FindParticipantParams): Promise<ParticipantSnapshot | null>;
  findById(params: { id: string }): Promise<ParticipantSnapshot | null>;
  resolveForRegistration(
    params: CreateParticipantFromRegistrationParams,
  ): Promise<ParticipantGatewayResult>;
}

export const PARTICIPANT_GATEWAY = Symbol('IParticipantGateway');
