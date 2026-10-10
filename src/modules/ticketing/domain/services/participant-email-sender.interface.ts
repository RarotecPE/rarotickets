export type SendPaymentConfirmedEmailParams = {
  email: string;
  participantName: string;
  registrationCode: string;
  eventTitle: string;
  eventStartAt: Date;
  eventEndAt?: Date;
  modality?: string;
  location?: string | null;
  onlineUrl?: string | null;
  lotName?: string | null;
  originalCents?: number;
  discountCents?: number;
  finalCents: number;
  paymentProvider?: string | null;
  paymentExternalId?: string | null;
  paidAt?: Date | null;
  qrPayload: string;
  participantUrl: string;
};

export interface IParticipantEmailSender {
  sendActivationEmail(params: { email: string; activationUrl: string }): Promise<void>;
  sendOtpEmail(params: { email: string; code: string }): Promise<void>;
  sendPaymentConfirmedEmail?(params: SendPaymentConfirmedEmailParams): Promise<void>;
}
