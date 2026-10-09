export interface IParticipantEmailSender {
  sendActivationEmail(params: { email: string; activationUrl: string }): Promise<void>;
  sendOtpEmail(params: { email: string; code: string }): Promise<void>;
}

