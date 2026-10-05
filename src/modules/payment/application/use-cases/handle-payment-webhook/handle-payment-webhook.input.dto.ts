export type HandlePaymentWebhookInputDto = {
  payload: unknown;
  rawBody: string;
  signature?: string | null;
  ip?: string | null;
};
