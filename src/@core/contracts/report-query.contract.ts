export type ReportFilter = {
  eventId?: string | null;
  from?: Date | null;
  to?: Date | null;
  search?: string | null;
  page: number;
  perPage: number;
};

export type ReportRow = Record<string, unknown>;

export type ReportResult = {
  rows: ReportRow[];
  total: number;
  summary: Record<string, unknown>;
};

export type DashboardIndicator = {
  key: string;
  label: string;
  value: number;
  formatted: string;
  hint: string | null;
};

export type DashboardResult = {
  indicators: DashboardIndicator[];
  updatedAt: Date;
};

export type ReportKey =
  | 'registrationsByEvent'
  | 'attendanceList'
  | 'checkIns'
  | 'registrationFunnel'
  | 'paymentsByPeriod'
  | 'openPayments'
  | 'refunds'
  | 'couponUsage'
  | 'waitlist'
  | 'participantsByLocation'
  | 'certificatesIssued'
  | 'revenueByLote'
  | 'communications';

/**
 * Porta de leitura dos relatórios (§41 a §43). Consultas de projeção não
 * carregam regra de negócio: são agregados SQL executados na infraestrutura.
 */
export interface IReportQueryGateway {
  registrationsByEvent(filter: ReportFilter): Promise<ReportResult>;
  attendanceList(filter: ReportFilter): Promise<ReportResult>;
  checkIns(filter: ReportFilter): Promise<ReportResult>;
  registrationFunnel(filter: ReportFilter): Promise<ReportResult>;
  paymentsByPeriod(filter: ReportFilter): Promise<ReportResult>;
  openPayments(filter: ReportFilter): Promise<ReportResult>;
  refunds(filter: ReportFilter): Promise<ReportResult>;
  couponUsage(filter: ReportFilter): Promise<ReportResult>;
  waitlist(filter: ReportFilter): Promise<ReportResult>;
  participantsByLocation(filter: ReportFilter): Promise<ReportResult>;
  certificatesIssued(filter: ReportFilter): Promise<ReportResult>;
  revenueByLote(filter: ReportFilter): Promise<ReportResult>;
  communications(filter: ReportFilter): Promise<ReportResult>;
  dashboard(filter: ReportFilter): Promise<DashboardResult>;
}

export const REPORT_QUERY_GATEWAY = Symbol('IReportQueryGateway');
