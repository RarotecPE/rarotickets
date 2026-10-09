import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readEnvironment } from "@/server/config/environment.config";
import { PaymentGateway } from "./payment-gateway.base";
import type { CreateCheckoutParams, NormalizedPaymentStatus, PaymentCheckout, PaymentWebhook, VerifyPaymentWebhookParams } from "./payment-gateway.base";

export class PagBankGateway extends PaymentGateway {
  async createCheckout(params: CreateCheckoutParams): Promise<PaymentCheckout> {
    const environment = readEnvironment();
    if (!environment.pagBankToken || environment.pagBankToken.startsWith("[")) {
      throw new Error("PAGBANK_TOKEN não configurado.");
    }
    const response = await fetch(`${environment.pagBankBaseUrl}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${environment.pagBankToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-idempotency-key": params.referenceId,
      },
      body: JSON.stringify({
        reference_id: params.referenceId,
        items: [{ name: params.description.slice(0, 100), quantity: 1, unit_amount: params.amountCents }],
        customer: {
          name: params.customer.name,
          email: params.customer.email,
          tax_id: params.customer.taxId.replace(/\D/g, ""),
          phones: [{ country: "55", area: params.customer.phone.replace(/\D/g, "").slice(0, 2), number: params.customer.phone.replace(/\D/g, "").slice(2), type: "MOBILE" }],
        },
        payment_methods: [{ type: "CREDIT_CARD" }, { type: "DEBIT_CARD" }, { type: "PIX" }, { type: "BOLETO" }],
        notification_urls: [params.notificationUrl],
        redirect_url: params.returnUrl,
        expiration_date: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        metadata: { reference_id: params.referenceId },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`PagBank recusou a criação do checkout (HTTP ${response.status}).`);
    const checkout = readCheckout(payload);
    if (!checkout) throw new Error("A resposta do PagBank não contém um link seguro de checkout.");
    return { ...checkout, provider: "pagbank" };
  }

  verifyWebhook(params: VerifyPaymentWebhookParams): boolean {
    const environment = readEnvironment();
    if (!environment.pagBankWebhookSecret || !params.signature) return false;
    const expected = createHmac("sha256", environment.pagBankWebhookSecret).update(params.rawBody).digest();
    const received = Buffer.from(params.signature.replace(/^sha256=/i, ""), "hex");
    return received.length === expected.length && timingSafeEqual(expected, received);
  }

  parseWebhook(payload: Record<string, unknown>): PaymentWebhook | null {
    const referenceId = firstString(payload.reference_id, nestedString(payload, "reference_id"));
    const externalId = firstString(payload.id, nestedString(payload, "id"));
    const status = mapPagBankStatus(firstString(payload.status, nestedString(payload, "status")));
    const eventId = firstString(payload.notification_id, payload.id, nestedString(payload, "id"));
    const amountValue = nestedNumber(payload, "amount", "value") ?? nestedNumber(payload, "charges", "0", "amount", "value");
    if (!referenceId || !externalId || !status || !eventId) return null;
    return { referenceId, externalId, status, eventId, amountCents: amountValue, rawPayload: payload };
  }
}

function readCheckout(payload: unknown): Omit<PaymentCheckout, "provider"> | null {
  if (!isRecord(payload)) return null;
  const links = Array.isArray(payload.links) ? payload.links : [];
  const payLink = links.find((item) => isRecord(item) && (item.rel === "PAY" || item.rel === "pay"));
  const checkoutUrl = isRecord(payLink) && typeof payLink.href === "string" ? payLink.href : "";
  const externalId = typeof payload.id === "string" ? payload.id : "";
  if (!externalId || !isHttpsUrl(checkoutUrl)) return null;
  return { externalId, checkoutUrl };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isHttpsUrl(value: string): boolean {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

function firstString(...values: unknown[]): string {
  return values.find((value): value is string => typeof value === "string" && value.length > 0) ?? "";
}

function nestedString(source: Record<string, unknown>, ...keys: string[]): string {
  return nestedValue(source, keys) as string || "";
}

function nestedNumber(source: Record<string, unknown>, ...keys: string[]): number | null {
  const value = nestedValue(source, keys);
  return typeof value === "number" ? value : null;
}

function nestedValue(source: Record<string, unknown>, keys: string[]): unknown {
  return keys.reduce<unknown>((current, key) => {
    if (key === "0" && Array.isArray(current)) return current[0];
    if (typeof current !== "object" || current === null) return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
}

function mapPagBankStatus(value: string): NormalizedPaymentStatus | null {
  const statusMap: Record<string, NormalizedPaymentStatus> = {
    WAITING_PAYMENT: "aguardando", IN_ANALYSIS: "aguardando", AUTHORIZED: "aguardando",
    PAID: "pago", AUTHORIZED_AND_CAPTURED: "pago", DECLINED: "recusado", REJECTED: "recusado",
    CANCELED: "cancelado", EXPIRED: "expirado", REFUNDED: "estornado",
  };
  return statusMap[value.toUpperCase()] ?? null;
}
