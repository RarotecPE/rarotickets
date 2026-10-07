export type DashboardMetrics = {
  events: number;
  registrations: number;
  confirmed: number;
  pending: number;
  waitlisted: number;
  checkedIn: number;
  revenueExpectedCents: number;
  revenuePaidCents: number;
  attendanceRate: number;
  upcomingEvents: UpcomingEventMetric[];
  recentRegistrations: RecentRegistrationMetric[];
};
export type UpcomingEventMetric = { id: string; title: string; slug: string; startAt: Date; status: string; capacity: number; confirmed: number; reserved: number };
export type RecentRegistrationMetric = { code: string; participantName: string; eventTitle: string; status: string; createdAt: Date; amountCents: number };
export type GetDashboardParams = { userId: string; canViewAll: boolean };
export type ReportParams = { eventId?: string; from?: Date; to?: Date; userId: string; canViewAll: boolean };
export type RevenueReport = { totalRegistrations: number; confirmed: number; waiting: number; cancelled: number; waitlisted: number; paidCents: number; expectedCents: number; attendanceRate: number; byCompany: Array<{ company: string; count: number }> };

export interface IReportingRepository {
  dashboard(params: GetDashboardParams): Promise<DashboardMetrics>;
  report(params: ReportParams): Promise<RevenueReport>;
}

export abstract class ReportingRepository implements IReportingRepository {
  abstract dashboard(params: GetDashboardParams): Promise<DashboardMetrics>;
  abstract report(params: ReportParams): Promise<RevenueReport>;
}
