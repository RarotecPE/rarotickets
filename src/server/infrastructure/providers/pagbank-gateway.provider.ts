import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { isPlaceholder, readEnvironment } from "@/server/config/environment.config";
import { PaymentGateway } from "./payment-gateway.base";
import type { CheckPaymentStatusParams, CreateCheckoutParams, NormalizedPaymentStatus, PaymentCheckout, PaymentWebhook, VerifyPaymentWebhookParams } from "./payment-gateway.base";

export class PagBankGateway extends PaymentGateway {
  async createCheckout(params: CreateCheckoutParams): Promise<PaymentCheckout> {
    const environment = readEnvironment();
    if (isPlaceholder(environment.pagBankToken)) {
      throw new Error("PAGBANK_TOKEN não configurado.");
    }
    const phoneDigits = params.customer.phone.replace(/\D/g, "");
    const taxIdDigits = params.customer.taxId.replace(/\D/g, "");
    const requestBody: Record<string, unknown> = {
      reference_id: params.referenceId,
      items: [
        {
          reference_id: params.referenceId,
          name: params.description.slice(0, 100),
          quantity: 1,
          unit_amount: params.amountCents,
        },
      ],
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        ...(taxIdDigits ? { tax_id: taxIdDigits } : {}),
        ...(phoneDigits.length >= 10
          ? {
              phones: [
                {
                  country: "55",
                  area: phoneDigits.slice(0, 2),
                  number: phoneDigits.slice(2),
                  type: "MOBILE",
                },
              ],
            }
          : {}),
      },
      payment_methods: [
        { type: "CREDIT_CARD" },
        { type: "PIX" },
        { type: "BOLETO" },
      ],
      expiration_date: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };

    if (isHttpsUrl(params.notificationUrl)) {
      requestBody.notification_urls = [params.notificationUrl];
      requestBody.payment_notification_urls = [params.notificationUrl];
    }
    if (isHttpsUrl(params.returnUrl)) {
      requestBody.redirect_url = params.returnUrl;
    }

    const response = await fetch(`${environment.pagBankBaseUrl}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${environment.pagBankToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-idempotency-key": params.referenceId,
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          `Credencial do PagBank inválida (HTTP 401). Verifique se o PAGBANK_TOKEN corresponde ao ambiente configurado (${environment.pagBankBaseUrl}).`,
        );
      }
      throw new Error(`PagBank recusou a criação do checkout (HTTP ${response.status}).`);
    }
    const checkout = readCheckout(payload);
    if (!checkout) throw new Error("A resposta do PagBank não contém um link seguro de checkout.");
    return { ...checkout, provider: "pagbank" };
  }

  verifyWebhook(params: VerifyPaymentWebhookParams): boolean {
    const environment = readEnvironment();
    const secret = !isPlaceholder(environment.pagBankWebhookSecret)
      ? environment.pagBankWebhookSecret
      : !isPlaceholder(environment.pagBankToken)
        ? environment.pagBankToken
        : "";
    if (!secret) return false;
    if (!params.signature) {
      return environment.pagBankEnvironment === "sandbox" && process.env.NODE_ENV !== "production";
    }
    const cleanSignature = params.signature.replace(/^sha256=/i, "").trim();
    const received = Buffer.from(cleanSignature, "hex");
    const expectedHmac = createHmac("sha256", secret).update(params.rawBody).digest();
    const expectedAuthenticity = createHash("sha256")
      .update(`${secret}-${params.rawBody}`)
      .digest();
    return (
      (received.length === expectedHmac.length && timingSafeEqual(expectedHmac, received)) ||
      (received.length === expectedAuthenticity.length &&
        timingSafeEqual(expectedAuthenticity, received))
    );
  }

  parseWebhook(payload: Record<string, unknown>): PaymentWebhook | null {
    const selectedCharge = selectRelevantCharge(payload);
    const rawStatus = firstString(
      selectedCharge ? readRecordString(selectedCharge, "status") : "",
      readRecordString(payload, "status"),
    );
    const status = mapPagBankStatus(rawStatus);
    const referenceId = firstString(
      readRecordString(payload, "reference_id"),
      selectedCharge ? readRecordString(selectedCharge, "reference_id") : "",
    );
    const externalId = firstString(
      readRecordString(payload, "id"),
      selectedCharge ? readRecordString(selectedCharge, "id") : "",
    );
    const chargeOrOrderId = firstString(
      selectedCharge ? readRecordString(selectedCharge, "id") : "",
      readRecordString(payload, "id"),
    );
    const eventId = firstString(
      readRecordString(payload, "notification_id"),
      chargeOrOrderId && rawStatus ? `${chargeOrOrderId}:${rawStatus.toUpperCase()}` : "",
      chargeOrOrderId,
    );

    const amountSource = selectedCharge ?? payload;
    const rawAmountValue =
      nestedNumber(amountSource, "amount", "value") ??
      nestedNumber(payload, "amount", "value");
    const buyerInterest =
      nestedNumber(amountSource, "amount", "fees", "buyer", "interest", "total") ?? 0;
    const amountCents =
      rawAmountValue !== null ? Math.max(0, rawAmountValue - buyerInterest) : null;

    if (!referenceId || !externalId || !status || !eventId) return null;
    return {
      referenceId,
      externalId,
      status,
      eventId,
      amountCents,
      rawPayload: payload,
    };
  }

  async checkPaymentStatus(
    params: CheckPaymentStatusParams,
  ): Promise<PaymentWebhook | null> {
    const environment = readEnvironment();
    if (isPlaceholder(environment.pagBankToken) || !params.externalId) {
      return null;
    }

    try {
      const headers = {
        Authorization: `Bearer ${environment.pagBankToken}`,
        Accept: "application/json",
      };

      if (params.externalId.startsWith("ORDE_")) {
        const orderResponse = await fetch(
          `${environment.pagBankBaseUrl}/orders/${encodeURIComponent(params.externalId)}`,
          {
            method: "GET",
            headers,
            cache: "no-store",
            signal: AbortSignal.timeout(8_000),
          },
        );
        if (!orderResponse.ok) return null;
        const orderPayload: unknown = await orderResponse.json().catch(() => null);
        if (!isRecord(orderPayload)) return null;
        return this.parseWebhook(orderPayload);
      }

      const checkoutResponse = await fetch(
        `${environment.pagBankBaseUrl}/checkouts/${encodeURIComponent(params.externalId)}`,
        {
          method: "GET",
          headers,
          cache: "no-store",
          signal: AbortSignal.timeout(8_000),
        },
      );
      if (!checkoutResponse.ok) return null;
      const checkoutPayload: unknown = await checkoutResponse.json().catch(() => null);
      if (!isRecord(checkoutPayload)) return null;

      const orders = Array.isArray(checkoutPayload.orders)
        ? checkoutPayload.orders
        : [];
      let latestWebhook: PaymentWebhook | null = null;

      for (const orderItem of [...orders].reverse()) {
        if (!isRecord(orderItem) || typeof orderItem.id !== "string" || !orderItem.id) {
          continue;
        }
        const orderResponse = await fetch(
          `${environment.pagBankBaseUrl}/orders/${encodeURIComponent(orderItem.id)}`,
          {
            method: "GET",
            headers,
            cache: "no-store",
            signal: AbortSignal.timeout(8_000),
          },
        );
        if (!orderResponse.ok) continue;
        const orderPayload: unknown = await orderResponse.json().catch(() => null);
        if (!isRecord(orderPayload)) continue;
        const parsed = this.parseWebhook(orderPayload);
        if (!parsed) continue;
        if (parsed.status === "pago") {
          return parsed;
        }
        if (!latestWebhook) {
          latestWebhook = parsed;
        }
      }

      return latestWebhook;
    } catch {
      return null;
    }
  }
}

function selectRelevantCharge(
  payload: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!Array.isArray(payload.charges) || payload.charges.length === 0) {
    return null;
  }
  const charges = payload.charges.filter(isRecord);
  if (charges.length === 0) return null;
  const paidCharge = charges.find(
    (charge) => mapPagBankStatus(readRecordString(charge, "status")) === "pago",
  );
  return paidCharge ?? charges[charges.length - 1] ?? null;
}

function readRecordString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
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
    WAITING: "aguardando", WAITING_PAYMENT: "aguardando", IN_ANALYSIS: "aguardando", AUTHORIZED: "aguardando",
    PAID: "pago", AUTHORIZED_AND_CAPTURED: "pago", DECLINED: "recusado", REJECTED: "recusado",
    CANCELED: "cancelado", EXPIRED: "expirado", REFUNDED: "estornado",
  };
  return statusMap[value.toUpperCase()] ?? null;
}
