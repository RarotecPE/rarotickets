import { createHash, timingSafeEqual } from 'node:crypto';
import type {
  CreateProviderChargeParams,
  IPaymentProvider,
  ParsedWebhookNotification,
  ProviderChargeResult,
  ProviderChargeSnapshot,
  ProviderRefundResult,
} from '@core/contracts/payment-provider.contract';
import type { ILogger } from '@server/infrastructure/logger/logger';

export type PagBankProviderDependencies = {
  apiBaseUrl: string;
  token: string;
  webhookSignatureHeader: string;
  webhookSecret: string;
  logger: ILogger;
};

type PagBankLink = { rel?: string; href?: string; media?: string };
type PagBankCharge = {
  id?: string;
  reference_id?: string;
  status?: string;
  amount?: { value?: number; currency?: string };
  payment_method?: {
    type?: string;
    card?: { brand?: string; last_digits?: string; first_digits?: string };
    boleto?: { barcode?: string; due_date?: string; form_url?: string };
  };
  qr_codes?: Array<{ text?: string; amount?: { value?: number }; expiration_date?: string; links?: PagBankLink[] }>;
  links?: PagBankLink[];
  authorization_code?: string;
  paid_at?: string;
};
type PagBankOrder = {
  id?: string;
  reference_id?: string;
  charges?: PagBankCharge[];
  created_at?: string;
};

const TIMEOUT_MS = 20_000;

/**
 * Integração com a API oficial do PagBank (§15 e §16). Somente o retorno
 * tokenizado é persistido: PAN e CVV nunca passam por esta camada.
 */
export class PagBankPaymentProvider implements IPaymentProvider {
  public readonly providerName = 'PAGBANK';

  private readonly apiBaseUrl: string;
  private readonly token: string;
  private readonly webhookSignatureHeader: string;
  private readonly webhookSecret: string;
  private readonly logger: ILogger;

  constructor(dependencies: PagBankProviderDependencies) {
    this.apiBaseUrl = dependencies.apiBaseUrl.replace(/\/$/, '');
    this.token = dependencies.token;
    this.webhookSignatureHeader = dependencies.webhookSignatureHeader;
    this.webhookSecret = dependencies.webhookSecret;
    this.logger = dependencies.logger;
  }

  async createCharge(params: CreateProviderChargeParams): Promise<ProviderChargeResult> {
    const body = {
      reference_id: params.reference,
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        tax_id: params.customer.cpf ? params.customer.cpf.replace(/\D/g, '') : undefined,
      },
      items: [
        {
          name: params.description.slice(0, 100),
          quantity: 1,
          unit_amount: params.amountCents,
        },
      ],
      notification_urls: [params.notificationUrl],
      charges: [this.buildCharge(params)],
    };

    try {
      const response = await this.request<PagBankOrder>({
        method: 'POST',
        path: '/orders',
        body,
        idempotencyKey: params.reference,
      });

      const charge = response.charges?.[0];
      if (!charge?.id) {
        return { status: 'FAILED', message: 'Provedor não retornou a cobrança criada' };
      }

      return {
        status: 'CREATED',
        providerChargeId: charge.id,
        providerStatus: charge.status ?? 'WAITING',
        payload: {
          qrCode: charge.qr_codes?.[0]?.text ?? null,
          qrCodeImageUrl:
            charge.qr_codes?.[0]?.links?.find((link) => link.rel === 'QRCODE.PNG')?.href ??
            charge.qr_codes?.[0]?.links?.[0]?.href ??
            null,
          expiresAt: charge.qr_codes?.[0]?.expiration_date
            ? new Date(charge.qr_codes[0].expiration_date)
            : params.expiresAt,
          boletoLine: charge.payment_method?.boleto?.barcode ?? null,
          boletoDueDate: charge.payment_method?.boleto?.due_date
            ? new Date(charge.payment_method.boleto.due_date)
            : null,
          boletoUrl: charge.payment_method?.boleto?.form_url ?? null,
          cardBrand: charge.payment_method?.card?.brand ?? null,
          cardLast4: charge.payment_method?.card?.last_digits ?? null,
          authorizationCode: charge.authorization_code ?? null,
          installments: params.installments,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido no provedor';
      this.logger.error('Falha ao criar cobrança no PagBank', { reference: params.reference, message });
      return { status: 'FAILED', message };
    }
  }

  async getCharge(params: { providerChargeId: string }): Promise<ProviderChargeSnapshot | null> {
    try {
      const charge = await this.request<PagBankCharge>({
        method: 'GET',
        path: `/charges/${encodeURIComponent(params.providerChargeId)}`,
      });
      return {
        providerChargeId: charge.id ?? params.providerChargeId,
        providerStatus: charge.status ?? 'WAITING',
        amountCents: charge.amount?.value ?? 0,
        paidAt: charge.paid_at ? new Date(charge.paid_at) : null,
        payload: {
          qrCode: charge.qr_codes?.[0]?.text ?? null,
          boletoLine: charge.payment_method?.boleto?.barcode ?? null,
          cardBrand: charge.payment_method?.card?.brand ?? null,
          cardLast4: charge.payment_method?.card?.last_digits ?? null,
        },
      };
    } catch (error) {
      this.logger.error('Falha ao consultar cobrança no PagBank', {
        providerChargeId: params.providerChargeId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async refundCharge(params: { providerChargeId: string; amountCents?: number }): Promise<ProviderRefundResult> {
    try {
      const result = await this.request<PagBankCharge>({
        method: 'POST',
        path: `/charges/${encodeURIComponent(params.providerChargeId)}/cancel`,
        body: params.amountCents ? { amount: { value: params.amountCents } } : {},
      });
      return { status: 'REFUNDED', providerRefundId: result.id ?? params.providerChargeId };
    } catch (error) {
      return { status: 'FAILED', message: error instanceof Error ? error.message : 'Erro no estorno' };
    }
  }

  parseWebhook(params: { payload: unknown }): ParsedWebhookNotification | null {
    const payload = params.payload as Partial<PagBankOrder> & { id?: string; status?: string; charges?: PagBankCharge[] };
    if (!payload || typeof payload !== 'object') return null;

    const charge = payload.charges?.[0];
    const notificationId =
      (typeof payload.id === 'string' && payload.id) ||
      (charge?.id ? `${charge.id}:${charge.status ?? 'UNKNOWN'}` : null);
    if (!notificationId) return null;

    return {
      notificationId,
      providerChargeId: charge?.id ?? null,
      reference: payload.reference_id ?? charge?.reference_id ?? null,
      providerStatus: charge?.status ?? payload.status ?? 'WAITING',
      occurredAt: new Date(),
      raw: payload as Record<string, unknown>,
    };
  }

  /** Valida o token de autenticidade enviado pelo PagBank no header (§20). */
  verifyWebhookSignature(params: { rawBody: string; signature: string | null }): boolean {
    if (!this.webhookSecret || this.webhookSecret.startsWith('PREENCHER')) return true;
    if (!params.signature) return false;

    const expected = createHash('sha256').update(`${params.rawBody}${this.webhookSecret}`).digest('hex');
    const received = params.signature.trim().toLowerCase();
    if (expected.length !== received.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  }

  private buildCharge(params: CreateProviderChargeParams): Record<string, unknown> {
    if (params.method === 'PIX') {
      return {
        reference_id: params.reference,
        description: params.description.slice(0, 100),
        amount: { value: params.amountCents, currency: 'BRL' },
        payment_method: { type: 'PIX', pix: { expires_in: this.pixExpiresInSeconds(params.expiresAt) } },
      };
    }

    if (params.method === 'BOLETO') {
      return {
        reference_id: params.reference,
        description: params.description.slice(0, 100),
        amount: { value: params.amountCents, currency: 'BRL' },
        payment_method: {
          type: 'BOLETO',
          boleto: {
            due_date: (params.expiresAt ?? new Date()).toISOString().slice(0, 10),
            instruction_lines: { line_1: 'Pagamento da inscrição no evento', line_2: 'Não aceitar após o vencimento' },
          },
        },
      };
    }

    // Cartão: apenas dados tokenizados chegam ao servidor (nunca PAN/CVV).
    return {
      reference_id: params.reference,
      description: params.description.slice(0, 100),
      amount: { value: params.amountCents, currency: 'BRL' },
      payment_method: {
        type: 'CREDIT_CARD',
        installments: params.installments,
        capture: true,
      },
    };
  }

  private pixExpiresInSeconds(expiresAt: Date | null): number {
    if (!expiresAt) return 3600;
    const seconds = Math.round((expiresAt.getTime() - Date.now()) / 1000);
    return Math.min(Math.max(seconds, 60), 86_400);
  }

  private async request<Response>(params: {
    method: 'GET' | 'POST';
    path: string;
    body?: unknown;
    idempotencyKey?: string;
  }): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${this.apiBaseUrl}${params.path}`, {
        method: params.method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          ...(params.idempotencyKey ? { 'x-idempotency-key': params.idempotencyKey } : {}),
        },
        body: params.body ? JSON.stringify(params.body) : undefined,
        signal: controller.signal,
      });

      const text = await response.text();
      const parsed = (text ? JSON.parse(text) : {}) as Response & {
        error_messages?: Array<{ description?: string; message?: string }>;
      };

      if (!response.ok) {
        const details = parsed.error_messages
          ?.map((item: { description?: string; message?: string }) => item.description ?? item.message ?? '')
          .filter(Boolean)
          .join('; ');
        throw new Error(details || `PagBank respondeu ${response.status}`);
      }

      return parsed;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export { PagBankPaymentProvider as PagBankProvider };
