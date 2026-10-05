/**
 * Meios enviados ao provedor. `CORTESIA` existe para que o fluxo interno nunca
 * precise de um caminho paralelo — provedores reais respondem `FAILED`, pois
 * cortesia não gera cobrança.
 */
export type ProviderPaymentMethod = 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'CORTESIA';

export type ProviderChargePayload = {
  qrCode: string | null;
  qrCodeImageUrl: string | null;
  expiresAt: Date | null;
  boletoLine: string | null;
  boletoDueDate: Date | null;
  boletoUrl: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  authorizationCode: string | null;
  installments: number | null;
};

export type CreateProviderChargeParams = {
  reference: string;
  amountCents: number;
  method: ProviderPaymentMethod;
  description: string;
  customer: { name: string; email: string; cpf: string | null };
  installments: number;
  expiresAt: Date | null;
  notificationUrl: string;
  metadata: Record<string, string>;
};

export type ProviderChargeResult =
  | { status: 'CREATED'; providerChargeId: string; providerStatus: string; payload: ProviderChargePayload }
  | { status: 'FAILED'; message: string; providerStatus?: string | null };

export type ProviderChargeSnapshot = {
  providerChargeId: string;
  providerStatus: string;
  amountCents: number;
  paidAt: Date | null;
  payload: Partial<ProviderChargePayload>;
};

export type ProviderRefundResult =
  | { status: 'REFUNDED'; providerRefundId: string | null }
  | { status: 'FAILED'; message: string };

export type ParsedWebhookNotification = {
  notificationId: string;
  providerChargeId: string | null;
  reference: string | null;
  providerStatus: string;
  occurredAt: Date | null;
  raw: Record<string, unknown>;
};

/**
 * Porta do provedor de pagamentos (§13 a §21). Nenhum dado sensível de cartão
 * (PAN/CVV) trafega ou é armazenado — somente o retorno tokenizado do provedor.
 */
export interface IPaymentProvider {
  readonly providerName: string;
  createCharge(params: CreateProviderChargeParams): Promise<ProviderChargeResult>;
  getCharge(params: { providerChargeId: string }): Promise<ProviderChargeSnapshot | null>;
  refundCharge(params: { providerChargeId: string; amountCents?: number }): Promise<ProviderRefundResult>;
  parseWebhook(params: { payload: unknown }): ParsedWebhookNotification | null;
  verifyWebhookSignature(params: { rawBody: string; signature: string | null }): boolean;
}

export const PAYMENT_PROVIDER = Symbol('IPaymentProvider');
