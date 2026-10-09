import type { IPaymentGateway, CreateCheckoutParams, PaymentCheckout, VerifyPaymentWebhookParams, PaymentWebhook } from "@/modules/ticketing/domain/services/payment-gateway.interface";

export type {
  CreateCheckoutParams,
  NormalizedPaymentStatus,
  PaymentCheckout,
  PaymentCustomer,
  PaymentWebhook,
  VerifyPaymentWebhookParams,
} from "@/modules/ticketing/domain/services/payment-gateway.interface";

export abstract class PaymentGateway implements IPaymentGateway {
  abstract createCheckout(params: CreateCheckoutParams): Promise<PaymentCheckout>;
  abstract verifyWebhook(params: VerifyPaymentWebhookParams): boolean;
  abstract parseWebhook(payload: Record<string, unknown>): PaymentWebhook | null;
}
