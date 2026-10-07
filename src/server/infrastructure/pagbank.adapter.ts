import { env } from "@/server/config/env";
import type {
  CreateCheckoutSessionParams,
  CreateCheckoutSessionResult,
  PaymentGatewayPort,
  PaymentStatusQueryResult,
  WebhookNotification,
  GatewayPaymentStatus,
} from "@/lib/domain/payment-gateway.port";
import { mockPagBank } from "./pagbank-mock.adapter";

/**
 * Adapter real do PagBank v4.
 * Quando as credenciais não estão configuradas (token vazio), delega para o Mock
 * para permitir o desenvolvimento local.
 */
export class PagBankGateway implements PaymentGatewayPort {
  private get isConfigured(): boolean {
    return Boolean(env.pagbank.token) && env.pagbank.token !== "seu-token-pagbank";
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CreateCheckoutSessionResult> {
    if (!this.isConfigured) return mockPagBank.createCheckoutSession(params);

    const body = {
      reference_id: params.referenceId,
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        tax_id: params.customer.document?.replace(/\D/g, ""),
      },
      items: [
        {
          reference_id: params.referenceId,
          name: params.description,
          quantity: 1,
          unit_amount: params.amountCents,
        },
      ],
      notification_urls: [params.webhookUrl],
      redirect_url: params.returnUrlSuccess,
      cancel_url: params.returnUrlFailure,
      // checkout em popup/lightbox
      payment_methods_configs: [
        { type: "credit_card" },
        { type: "pix" },
        { type: "boleto" },
      ],
    };

    const res = await fetch(`${env.pagbank.baseUrl}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.pagbank.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { id?: string; error_messages?: unknown };
    if (!res.ok || !data.id) {
      throw new Error(`Erro PagBank ao criar checkout: ${JSON.stringify(data)}`);
    }
    return {
      sessionId: data.id,
      checkoutUrl: `${env.appBaseUrl}/inscricao/${params.referenceId}/pagamento`,
      lightboxId: data.id,
    };
  }

  async getPaymentStatus(params: { gatewayOrderId: string }): Promise<PaymentStatusQueryResult> {
    if (!this.isConfigured) return mockPagBank.getPaymentStatus(params);

    const res = await fetch(`${env.pagbank.baseUrl}/checkouts/${params.gatewayOrderId}`, {
      headers: { Authorization: `Bearer ${env.pagbank.token}` },
    });
    const data = (await res.json()) as {
      id?: string;
      status?: GatewayPaymentStatus;
      payment_method?: { type?: "CREDIT_CARD" | "PIX" | "BOLETO" };
    };
    return {
      status: (data.status ?? "WAITING_PAYMENT") as GatewayPaymentStatus,
      method:
        data.payment_method?.type === "CREDIT_CARD"
          ? "CARTAO"
          : data.payment_method?.type === "BOLETO"
          ? "BOLETO"
          : "PIX",
      rawPayload: JSON.stringify(data),
    };
  }

  async parseWebhook(params: { rawBody: string; headers: Record<string, string | string[] | undefined> }): Promise<WebhookNotification | null> {
    if (!this.isConfigured) return null;
    // Validação simples de assinatura (ajustar conforme doc oficial do PagBank).
    const sig = params.headers["x-authenticity-token"] ?? params.headers["authorization"];
    if (env.pagbank.webhookSecret && sig !== env.pagbank.webhookSecret) {
      return null;
    }
    try {
      const payload = JSON.parse(params.rawBody) as {
        id?: string;
        reference_id?: string;
        charges?: Array<{ id?: string; status?: GatewayPaymentStatus; payment_method?: { type?: string } }>;
      };
      const charge = payload.charges?.[0];
      if (!charge || !payload.reference_id) return null;
      return {
        eventType: "payment.updated",
        referenceId: payload.reference_id,
        gatewayOrderId: charge.id ?? payload.id ?? "",
        status: charge.status ?? "WAITING_PAYMENT",
        rawPayload: params.rawBody,
      };
    } catch {
      return null;
    }
  }

  async refundPayment(params: { gatewayOrderId: string; amountCents: number }): Promise<boolean> {
    if (!this.isConfigured) return mockPagBank.refundPayment(params);
    try {
      const res = await fetch(
        `${env.pagbank.baseUrl}/charges/${params.gatewayOrderId}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.pagbank.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount: { value: params.amountCents } }),
        },
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const paymentGateway = new PagBankGateway();
