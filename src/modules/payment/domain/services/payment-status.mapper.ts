import type { PaymentStatusValue } from '../value-objects/payment-status.vo';

/**
 * Mapeamento entre os status do provedor (PagBank) e os status internos (§16).
 * Regra de negócio: vive no domínio, sem conhecer detalhes de runtime.
 */
const PAGBANK_STATUS_MAP: Record<string, PaymentStatusValue> = {
  WAITING: 'AGUARDANDO',
  PENDING: 'AGUARDANDO',
  AUTHORIZED: 'AGUARDANDO',
  IN_ANALYSIS: 'AGUARDANDO',
  PAID: 'PAGO',
  AVAILABLE: 'PAGO',
  APPROVED: 'PAGO',
  DECLINED: 'RECUSADO',
  REJECTED: 'RECUSADO',
  REFUSED: 'RECUSADO',
  CANCELED: 'CANCELADO',
  CANCELLED: 'CANCELADO',
  EXPIRED: 'EXPIRADO',
  REFUNDED: 'ESTORNADO',
  CHARGEBACK: 'ESTORNADO',
};

export function mapProviderStatus(providerStatus: string | null | undefined): PaymentStatusValue | null {
  if (!providerStatus) return null;
  return PAGBANK_STATUS_MAP[providerStatus.trim().toUpperCase()] ?? null;
}

export function isProviderStatusFinal(providerStatus: string | null | undefined): boolean {
  const mapped = mapProviderStatus(providerStatus);
  return mapped !== null && ['PAGO', 'CANCELADO', 'ESTORNADO'].includes(mapped);
}

export function describeProviderStatus(providerStatus: string): string {
  const mapped = mapProviderStatus(providerStatus);
  return mapped ? `Status do provedor ${providerStatus} mapeado para ${mapped}` : `Status do provedor ${providerStatus} sem mapeamento interno`;
}
