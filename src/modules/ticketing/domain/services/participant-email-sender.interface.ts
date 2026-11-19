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

export type SendWaitlistPromotedEmailParams = {
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
  status: "pendente" | "confirmada";
  amountCents: number;
  waitlistExpiresAt?: Date | null;
  qrPayload?: string | null;
  participantUrl: string;
};

export type SendPixPendingNotificationEmailParams = {
  toEmail: string;
  eventTitle: string;
  registrationCode: string;
  participantName: string;
  participantEmail: string;
  participantPhone?: string | null;
  amountCents: number;
  lotName?: string | null;
  createdAt: Date;
  reservationExpiresAt?: Date | null;
};

export type CertificateEmailExtraAttachmentPayload = {
  filename: string;
  contentType: string;
  contentBase64?: string;
  contentUrl?: string;
};

export type SendCertificateEmailParams = {
  toEmail: string;
  subject: string;
  bodyText: string;
  participantName: string;
  eventTitle: string;
  workloadHours: number;
  authenticationCode: string;
  verificationUrl: string;
  attachmentFilename: string;
  attachmentBase64: string;
  extraAttachments?: CertificateEmailExtraAttachmentPayload[];
  isTest?: boolean;
};

export type SendCertificateEmailResult = {
  sent: boolean;
  messageId: string | null;
};

export interface IParticipantEmailSender {
  sendActivationEmail(params: { email: string; activationUrl: string }): Promise<void>;
  sendOtpEmail(params: { email: string; code: string }): Promise<void>;
  sendPaymentConfirmedEmail?(params: SendPaymentConfirmedEmailParams): Promise<void>;
  sendWaitlistPromotedEmail?(params: SendWaitlistPromotedEmailParams): Promise<void>;
  sendPixPendingNotificationEmail?(params: SendPixPendingNotificationEmailParams): Promise<void>;
  sendCertificateEmail?(params: SendCertificateEmailParams): Promise<SendCertificateEmailResult>;
}
