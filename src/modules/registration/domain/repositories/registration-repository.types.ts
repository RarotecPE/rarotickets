export type RegistrationId = string;
export type RegistrationCode = string;
export type RegistrationListParams = { limit?: number; offset?: number };
export type RegistrationEventListParams = RegistrationListParams & { eventId: string };
export type RegistrationParticipantListParams = RegistrationListParams & { participantId: string };
