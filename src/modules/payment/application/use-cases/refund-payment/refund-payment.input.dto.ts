export type RefundPaymentInputDto = {
  paymentId?: string | null;
  reference?: string | null;
  reason: string;
  amountCents?: number | null;
  actorUserId?: string | null;
  actorName?: string | null;
  ip?: string | null;
};
