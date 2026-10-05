import { createHash } from 'node:crypto';
import type {
  CreateProviderChargeParams,
  IPaymentProvider,
  ParsedWebhookNotification,
  ProviderChargeResult,
  ProviderChargeSnapshot,
  ProviderRefundResult,
} from '@core/contracts/payment-provider.contract';
import type { ILogger } from '@server/infrastructure/logger/logger';

export const SIMULATED_PROVIDER_NAME = 'SIMULADO';

type SimulatedCharge = {
  chargeId: string;
  status: string;
  amountCents: number;
  paidAt: Date | null;
};

/**
 * Provedor de desenvolvimento: mantém o fluxo completo (PIX, boleto e cartão)
 * funcionando enquanto o `.env` não recebe as credenciais reais do PagBank.
 * Nenhuma cobrança é enviada a terceiros e a liquidação é simulada.
 */
export class SimulatedPaymentProvider implements IPaymentProvider {
  public readonly providerName = SIMULATED_PROVIDER_NAME;

  private readonly logger: ILogger;
  private readonly charges = new Map<string, SimulatedCharge>();

  constructor(dependencies: { logger: ILogger }) {
    this.logger = dependencies.logger;
  }

  async createCharge(params: CreateProviderChargeParams): Promise<ProviderChargeResult> {
    const chargeId = `SIM-${createHash('sha1').update(params.reference).digest('hex').slice(0, 12).toUpperCase()}`;
    const status = params.method === 'PIX' ? 'WAITING' : params.method === 'BOLETO' ? 'WAITING' : 'AUTHORIZED';
    this.charges.set(chargeId, { chargeId, status, amountCents: params.amountCents, paidAt: null });

    this.logger.info('Cobrança simulada criada (PagBank não configurado)', {
      reference: params.reference,
      method: params.method,
      amountCents: params.amountCents,
    });

    const expiresAt = params.expiresAt ?? new Date(Date.now() + 30 * 60 * 1000);
    return {
      status: 'CREATED',
      providerChargeId: chargeId,
      providerStatus: status,
      payload: {
        qrCode: params.method === 'PIX' ? `00020126SIMULADO${chargeId}5204000053039865802BR6009SAO PAULO` : null,
        qrCodeImageUrl: null,
        expiresAt,
        boletoLine: params.method === 'BOLETO' ? '34191.09008 61713.957022 71460.491008 8 00000000000000' : null,
        boletoDueDate: params.method === 'BOLETO' ? expiresAt : null,
        boletoUrl: null,
        cardBrand: params.method === 'CREDIT_CARD' ? 'SIMULADO' : null,
        cardLast4: params.method === 'CREDIT_CARD' ? '0000' : null,
        authorizationCode: params.method === 'CREDIT_CARD' ? `AUTH${chargeId.slice(-6)}` : null,
        installments: params.installments,
      },
    };
  }

  async getCharge(params: { providerChargeId: string }): Promise<ProviderChargeSnapshot | null> {
    const charge = this.charges.get(params.providerChargeId);
    if (!charge) return null;
    return {
      providerChargeId: charge.chargeId,
      providerStatus: charge.status,
      amountCents: charge.amountCents,
      paidAt: charge.paidAt,
      payload: {},
    };
  }

  async refundCharge(params: { providerChargeId: string; amountCents?: number }): Promise<ProviderRefundResult> {
    const charge = this.charges.get(params.providerChargeId);
    if (charge) charge.status = 'REFUNDED';
    return { status: 'REFUNDED', providerRefundId: `SIMREF-${params.providerChargeId}` };
  }

  /** Simula a liquidação (usado apenas em desenvolvimento e nos testes). */
  simulatePayment(params: { providerChargeId: string }): boolean {
    const charge = this.charges.get(params.providerChargeId);
    if (!charge) return false;
    charge.status = 'PAID';
    charge.paidAt = new Date();
    return true;
  }

  parseWebhook(params: { payload: unknown }): ParsedWebhookNotification | null {
    const payload = params.payload as {
      id?: string;
      charge_id?: string;
      reference_id?: string;
      status?: string;
    };
    if (!payload?.charge_id || !payload?.status) return null;
    return {
      notificationId: payload.id ?? `${payload.charge_id}:${payload.status}`,
      providerChargeId: payload.charge_id,
      reference: payload.reference_id ?? null,
      providerStatus: payload.status,
      occurredAt: new Date(),
      raw: payload as Record<string, unknown>,
    };
  }

  verifyWebhookSignature(params: { rawBody: string; signature: string | null }): boolean {
    // Em desenvolvimento a assinatura é aceita; a validação real é do PagBank.
    return Boolean(params.rawBody);
  }
}
