export type CancelPaymentInputDto = {
  paymentId: string;
  reason: string;
  actorUserId?: string | null;
  actorName?: string | null;
  ip?: string | null;
};
