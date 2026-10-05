import { ApiService } from '@/client/services/api-service.base';
import type { ApiServiceDependencies } from '@/client/services/api-service.base';

export type PaymentView = {
  id: string;
  registrationId: string;
  eventId: string;
  participantId: string;
  reference: string;
  method: string;
  methodLabel: string;
  status: string;
  statusLabel: string;
  amountCents: number;
  amountFormatted: string;
  installments: number;
  installmentCents: number;
  installmentFormatted: string;
  expiresAt: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  refundedAmountCents: number | null;
  refundReason: string | null;
  cancelReason: string | null;
  failureReason: string | null;
  providerName: string | null;
  paymentData: {
    qrCode: string | null;
    qrCodeImageUrl: string | null;
    qrCodeExpiresAt: string | null;
    boletoLine: string | null;
    boletoUrl: string | null;
    boletoDueDate: string | null;
    cardBrand: string | null;
    cardLast4: string | null;
    authorizationCode: string | null;
    providerStatus: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type PaymentEventView = {
  type: string;
  fromStatus: string | null;
  toStatus: string;
  providerStatus: string | null;
  description: string;
  actorName: string | null;
  occurredAt: string;
};

export type PaymentDetailView = {
  payments: PaymentView[];
  events: PaymentEventView[];
  registration: {
    registrationId: string;
    code: string;
    status: string;
    seatStatus: string;
    finalAmountCents: number;
    reservationExpiresAt: string | null;
    waitlistPosition: number | null;
  } | null;
};

export type PaymentInstructionsView = {
  method: string;
  qrCode: string | null;
  qrCodeImageUrl: string | null;
  boletoLine: string | null;
  boletoUrl: string | null;
  boletoDueDate: string | null;
  expiresAt: string | null;
  installments: number;
  installmentFormatted: string;
};

export type InitiatePaymentResponse = { payment: PaymentView; instructions: PaymentInstructionsView };

export type PaymentTotalsView = {
  count: number;
  paidCents: number;
  pendingCents: number;
  refundedCents: number;
  paidFormatted: string;
  pendingFormatted: string;
  refundedFormatted: string;
};

export type PaymentListParams = {
  eventId?: string;
  status?: string;
  method?: string;
  search?: string;
  page?: number;
  perPage?: number;
};

export type PaymentListResponse = { payments: PaymentView[]; totals: PaymentTotalsView; total: number };

/** Cobranças PagBank: criação, consulta, estorno, cancelamento e reconciliação (§13–§22). */
export class PaymentApiService extends ApiService {
  constructor(dependencies: ApiServiceDependencies) {
    super(dependencies);
  }

  async initiate(params: {
    registrationId: string;
    method: string;
    installments?: number;
  }): Promise<InitiatePaymentResponse> {
    const response = await this.httpClient.post<InitiatePaymentResponse>(
      `/registrations/${params.registrationId}/payments`,
      { method: params.method, installments: params.installments ?? 1 },
    );
    return response.data;
  }

  async byRegistration(registrationId: string): Promise<PaymentDetailView> {
    const response = await this.httpClient.get<PaymentDetailView>(`/registrations/${registrationId}/payments`);
    return response.data;
  }

  async detail(params: { paymentId?: string; reference?: string }): Promise<PaymentDetailView> {
    const path = params.paymentId ? `/payments/${params.paymentId}` : `/payments/${params.reference ?? ''}`;
    const response = await this.httpClient.get<PaymentDetailView>(path);
    return response.data;
  }

  async listAdmin(params: PaymentListParams = {}): Promise<PaymentListResponse> {
    const response = await this.httpClient.get<PaymentView[]>('/admin/payments', {
      query: {
        eventId: params.eventId,
        status: params.status,
        method: params.method,
        search: params.search,
        page: params.page,
        perPage: params.perPage ?? 20,
      },
    });
    const meta = response.meta ?? {};
    return {
      payments: response.data,
      totals: (meta.totals as PaymentTotalsView) ?? {
        count: 0,
        paidCents: 0,
        pendingCents: 0,
        refundedCents: 0,
        paidFormatted: '—',
        pendingFormatted: '—',
        refundedFormatted: '—',
      },
      total: Number(meta.total ?? response.data.length),
    };
  }

  async refund(params: { paymentId: string; reason: string; amountCents?: number | null }): Promise<PaymentView> {
    const response = await this.httpClient.post<{ payment: PaymentView }>(
      `/admin/payments/${params.paymentId}/refund`,
      { reason: params.reason, amountCents: params.amountCents ?? null },
    );
    return response.data.payment;
  }

  async cancel(params: { paymentId: string; reason: string }): Promise<PaymentView> {
    const response = await this.httpClient.post<{ payment: PaymentView }>(
      `/admin/payments/${params.paymentId}/cancel`,
      { reason: params.reason },
    );
    return response.data.payment;
  }

  async reconcile(params: { windowHours?: number; limit?: number } = {}): Promise<{
    checked: number;
    applied: number;
    ignored: number;
    requiresReview: number;
  }> {
    const response = await this.httpClient.post<{
      checked: number;
      applied: number;
      ignored: number;
      requiresReview: number;
    }>('/admin/payments/reconcile', params);
    return response.data;
  }

  /** Simula a confirmação do provedor em desenvolvimento (§dev). */
  async simulate(paymentId: string): Promise<{ message: string }> {
    const response = await this.httpClient.post<{ message: string }>(`/dev/payments/${paymentId}/simulate`, {});
    return response.data;
  }
}
