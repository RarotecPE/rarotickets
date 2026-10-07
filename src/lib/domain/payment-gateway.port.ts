/**
 * Porta de domínio para gateways de pagamento (PagBank).
 * Qualquer implementação deve cumprir este contrato; o domínio não conhece SDKs.
 */

export type CreateCheckoutSessionParams = {
  referenceId: string;
  amountCents: number;
  description: string;
  customer: { name: string; email: string; document?: string };
  returnUrlSuccess: string;
  returnUrlFailure: string;
  webhookUrl: string;
};

export type CreateCheckoutSessionResult = {
  sessionId: string;
  checkoutUrl: string;
  // Dados para o popup/lightbox PagBank (id da sessão para o JS SDK)
  lightboxId?: string;
};

export type GatewayPaymentStatus =
  | "WAITING_PAYMENT"
  | "IN_ANALYSIS"
  | "AUTHORIZED"
  | "PAID"
  | "AUTHORIZED_AND_CAPTURED"
  | "DECLINED"
  | "REJECTED"
  | "CANCELED"
  | "EXPIRED"
  | "REFUNDED";

export type PaymentStatusQueryResult = {
  status: GatewayPaymentStatus;
  method?: "PIX" | "CARTAO" | "BOLETO";
  rawPayload: string;
};

export type WebhookNotification = {
  eventType: string;
  referenceId: string;
  gatewayOrderId: string;
  status: GatewayPaymentStatus;
  rawPayload: string;
};

export interface PaymentGatewayPort {
  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CreateCheckoutSessionResult>;
  getPaymentStatus(params: { gatewayOrderId: string }): Promise<PaymentStatusQueryResult>;
  parseWebhook(params: { rawBody: string; headers: Record<string, string | string[] | undefined> }): Promise<WebhookNotification | null>;
  refundPayment(params: { gatewayOrderId: string; amountCents: number }): Promise<boolean>;
}

export const PAYMENT_GATEWAY = Symbol("PaymentGatewayPort");
