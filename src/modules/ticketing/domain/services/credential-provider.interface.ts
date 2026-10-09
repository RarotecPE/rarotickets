export type IssuedCapabilityToken = { rawToken: string; hash: string };
export type AccessTokenParams = { registrationId: string };
export type RegistrationCodeParams = { year: number };
export type VerifyCredentialParams = { token: string };

export interface ICredentialProvider {
  issueAccessToken(params: AccessTokenParams): IssuedCapabilityToken;
  issueRegistrationCode(params: RegistrationCodeParams): string;
  issueCertificateCode(params: RegistrationCodeParams): string;
  createQrToken(params: { registrationId: string }): string;
  verifyQrToken(params: VerifyCredentialParams): string | null;
  hashToken(params: { token: string }): string;
}
