export type PaymentCustomer = {
  name: string;
  email: string;
  taxId: string;
  phone: string;
};
export type CreateCheckoutParams = {
  referenceId: string;
  description: string;
  amountCents: number;
  customer: PaymentCustomer;
  notificationUrl: string;
  returnUrl: string;
};
export type PaymentCheckout = {
  externalId: string;
  checkoutUrl: string;
  provider: "pagbank" | "mock";
};
export type NormalizedPaymentStatus = "aguardando" | "pago" | "recusado" | "cancelado" | "expirado" | "estornado";
export type PaymentWebhook = {
  eventId: string;
  referenceId: string;
  externalId: string;
  status: NormalizedPaymentStatus;
  amountCents: number | null;
  rawPayload: Record<string, unknown>;
};
export type VerifyPaymentWebhookParams = { rawBody: string; signature: string | null };

export interface IPaymentGateway {
  createCheckout(params: CreateCheckoutParams): Promise<PaymentCheckout>;
  verifyWebhook(params: VerifyPaymentWebhookParams): boolean;
  parseWebhook(payload: Record<string, unknown>): PaymentWebhook | null;
}
