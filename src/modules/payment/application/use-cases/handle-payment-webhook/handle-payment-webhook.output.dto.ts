export type HandlePaymentWebhookOutputDto = {
  received: boolean;
  duplicated: boolean;
  processed: boolean;
  outcome: string | null;
  message: string;
};
