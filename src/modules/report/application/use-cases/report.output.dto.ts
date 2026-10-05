import type { DashboardIndicator, ReportRow } from '@core/contracts/report-query.contract';

export type ReportOutputDto = {
  report: string;
  rows: ReportRow[];
  total: number;
  summary: Record<string, unknown>;
  generatedAt: Date;
};

export type DashboardOutputDto = {
  indicators: DashboardIndicator[];
  updatedAt: Date;
};
