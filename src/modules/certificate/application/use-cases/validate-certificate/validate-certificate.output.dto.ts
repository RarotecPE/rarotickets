export type ValidateCertificateOutputDto = {
  valid: boolean;
  code: string;
  status: string;
  participantName: string | null;
  eventTitle: string | null;
  workloadHours: number;
  issuedAt: Date | null;
  cancelledAt: Date | null;
  message: string;
};
