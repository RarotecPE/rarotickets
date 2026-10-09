import "server-only";
import { randomUUID } from "node:crypto";
import { readEnvironment } from "@/server/config/environment.config";
import { PaymentGateway } from "./payment-gateway.base";
import type { CreateCheckoutParams, NormalizedPaymentStatus, PaymentCheckout, PaymentWebhook } from "./payment-gateway.base";

export class MockPagBankGateway extends PaymentGateway {
  async createCheckout(params: CreateCheckoutParams): Promise<PaymentCheckout> {
    const environment = readEnvironment();
    return {
      externalId: `mock_${randomUUID()}`,
      checkoutUrl: `${environment.appBaseUrl}/checkout/mock?reference=${encodeURIComponent(params.referenceId)}`,
      provider: "mock",
    };
  }

  verifyWebhook(): boolean {
    return process.env.NODE_ENV !== "production";
  }

  parseWebhook(payload: Record<string, unknown>): PaymentWebhook | null {
    const referenceId = readString(payload.reference_id);
    const externalId = readString(payload.id);
    const eventId = readString(payload.event_id) || readString(payload.id);
    const status = normalizeStatus(readString(payload.status));
    if (!referenceId || !externalId || !eventId || !status) return null;
    return { referenceId, externalId, eventId, status, amountCents: readNumber(payload.amount_cents), rawPayload: payload };
  }
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function normalizeStatus(value: string): NormalizedPaymentStatus | null {
  const statuses: Record<string, NormalizedPaymentStatus> = {
    WAITING_PAYMENT: "aguardando", IN_ANALYSIS: "aguardando", AUTHORIZED: "aguardando",
    PAID: "pago", AUTHORIZED_AND_CAPTURED: "pago", DECLINED: "recusado", REJECTED: "recusado",
    CANCELED: "cancelado", EXPIRED: "expirado", REFUNDED: "estornado",
  };
  return statuses[value.toUpperCase()] ?? null;
}
