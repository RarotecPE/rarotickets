import type {
  CreateCheckoutSessionParams,
  CreateCheckoutSessionResult,
  PaymentGatewayPort,
  PaymentStatusQueryResult,
  WebhookNotification,
} from "@/lib/domain/payment-gateway.port";

/**
 * Adapter Mock do PagBank para desenvolvimento local.
 * Simula a criação de sessão, o popup e a confirmação de pagamento sem
 * necessidade de credenciais reais. Permite testar o fluxo completo.
 */
export class MockPagBankGateway implements PaymentGatewayPort {
  // sessões em memória para simulação
  private sessions = new Map<string, { referenceId: string; status: string }>();

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CreateCheckoutSessionResult> {
    const sessionId = `mock-pag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.sessions.set(sessionId, { referenceId: params.referenceId, status: "WAITING_PAYMENT" });
    return {
      sessionId,
      // URL de simulação da confirmação imediata (endpoint mock)
      checkoutUrl: `/api/dev/mock-pay?session=${sessionId}&ref=${params.referenceId}`,
      lightboxId: sessionId,
    };
  }

  async getPaymentStatus(params: { gatewayOrderId: string }): Promise<PaymentStatusQueryResult> {
    const s = this.sessions.get(params.gatewayOrderId);
    const status = s?.status ?? "WAITING_PAYMENT";
    return {
      status: status as PaymentStatusQueryResult["status"],
      method: "PIX",
      rawPayload: JSON.stringify({ mock: true, gatewayOrderId: params.gatewayOrderId, status }),
    };
  }

  async parseWebhook(_params: { rawBody: string; headers: Record<string, string | string[] | undefined> }): Promise<WebhookNotification | null> {
    // Mock não valida webhooks reais; este adapter é usado só em dev.
    return null;
  }

  async refundPayment(_params: { gatewayOrderId: string; amountCents: number }): Promise<boolean> {
    return true;
  }

  /** Função auxiliar do mock para simular confirmação de pagamento. */
  public async simulatePaid(sessionId: string): Promise<{ referenceId: string } | null> {
    const s = this.sessions.get(sessionId);
    if (!s) return null;
    s.status = "PAID";
    return { referenceId: s.referenceId };
  }
}

export const mockPagBank = new MockPagBankGateway();
