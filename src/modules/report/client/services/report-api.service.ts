import { ApiService } from '@/client/services/api-service.base';
import type { ApiServiceDependencies } from '@/client/services/api-service.base';

export type DashboardIndicatorView = {
  key: string;
  label: string;
  value: number;
  formatted: string;
  hint?: string | null;
  tone?: string | null;
};

export type DashboardView = { indicators: DashboardIndicatorView[]; updatedAt: string };

export type ReportRowView = Record<string, string | number | null>;

export type ReportView = {
  report: string;
  rows: ReportRowView[];
  total: number;
  summary: Record<string, unknown>;
  generatedAt: string;
};

export type ReportFilterParams = {
  eventId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  perPage?: number;
};

export const REPORT_KEYS = [
  'registrations-by-event',
  'attendance-list',
  'check-ins',
  'registration-funnel',
  'payments-by-period',
  'open-payments',
  'refunds',
  'coupon-usage',
  'waitlist',
  'participants-by-location',
  'certificates-issued',
  'revenue-by-lote',
  'communications',
] as const;

export type ReportKey = (typeof REPORT_KEYS)[number];

/** Indicadores do dashboard e os 13 relatórios operacionais (§41). */
export class ReportApiService extends ApiService {
  constructor(dependencies: ApiServiceDependencies) {
    super(dependencies);
  }

  async dashboard(params: Omit<ReportFilterParams, 'page' | 'perPage'> = {}): Promise<DashboardView> {
    const response = await this.httpClient.get<DashboardView>('/admin/dashboard', {
      query: { eventId: params.eventId, from: params.from, to: params.to, search: params.search },
    });
    return response.data;
  }

  async report(reportKey: ReportKey, params: ReportFilterParams = {}): Promise<ReportView> {
    const response = await this.httpClient.get<ReportView>(`/admin/reports/${reportKey}`, {
      query: {
        eventId: params.eventId,
        from: params.from,
        to: params.to,
        search: params.search,
        page: params.page,
        perPage: params.perPage ?? 50,
      },
    });
    return response.data;
  }
}
