export type GetRegistrationCredentialOutputDto = {
  code: string;
  token: string;
  qrPayload: string;
  credentialUrl: string;
  eventTitle: string | null;
  participantName: string | null;
};
