export type ParticipantView = {
  id: string;
  name: string;
  email: string;
  cpfMasked: string;
  createdAt: string;
};

export type ParticipantSessionResponse = {
  data: { authenticated: boolean; participant?: ParticipantView };
};

export type RegisterParticipantRequest = { name: string; email: string; cpf: string; password: string };
export type LoginParticipantRequest = { email: string; password: string };
export type RegisterParticipantResponse = { data: { participant: ParticipantView } };
export type LoginParticipantResponse = { data: { participant: ParticipantView } };
export type ParticipantLogoutResponse = { data: { localSessionCleared: boolean } };
