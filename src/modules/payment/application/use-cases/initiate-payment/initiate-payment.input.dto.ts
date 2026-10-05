export type InitiatePaymentInputDto = {
  registrationId?: string | null;
  registrationCode?: string | null;
  method: string;
  installments?: number;
  actorUserId?: string | null;
  actorName?: string | null;
  ip?: string | null;
};
