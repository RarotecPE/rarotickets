import "server-only";
import { and, count, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { ReportingRepository } from "@/modules/ticketing/domain/repositories/reporting-repository.interface";
import type { DashboardMetrics, GetDashboardParams, ReportParams, RevenueReport } from "@/modules/ticketing/domain/repositories/reporting-repository.interface";
import { checkins, events, participants, payments, registrations } from "@/server/infrastructure/persistence/schema";
import type { Database } from "@/server/infrastructure/persistence/database";

export type DrizzleReportingRepositoryDependencies = { database: Database };

export class DrizzleReportingRepository extends ReportingRepository {
  private readonly database: Database;
  constructor(dependencies: DrizzleReportingRepositoryDependencies) {
    super();
    this.database = dependencies.database;
  }

  async dashboard(params: GetDashboardParams): Promise<DashboardMetrics> {
    const eventFilters = this.eventFilters(params.userId, params.canViewAll);
    const registrationFilters = this.registrationFilters(params.userId, params.canViewAll);
    const [eventCountRow, registrationStats, paidStats, checkinStats, upcomingRows, recentRows] = await Promise.all([
      this.database.select({ value: count() }).from(events).where(and(...eventFilters)),
      this.database.select({
        registrations: count(),
        confirmed: sql<number>`count(*) filter (where ${registrations.status} = 'confirmada')`,
        pending: sql<number>`count(*) filter (where ${registrations.status} in ('pendente', 'aguardando_pagamento'))`,
        waitlisted: sql<number>`count(*) filter (where ${registrations.status} = 'lista_espera')`,
        expectedCents: sql<number>`coalesce(sum(${registrations.finalCents}) filter (where ${registrations.status} in ('confirmada', 'pendente', 'aguardando_pagamento')), 0)`,
      }).from(registrations).innerJoin(events, eq(registrations.eventId, events.id)).where(and(...registrationFilters, isNull(registrations.deletedAt))),
      this.database.select({ value: sql<number>`coalesce(sum(${payments.amountCents}) filter (where ${payments.status} = 'pago'), 0)` }).from(payments)
        .innerJoin(registrations, eq(payments.registrationId, registrations.id)).innerJoin(events, eq(registrations.eventId, events.id)).where(and(...registrationFilters, isNull(registrations.deletedAt))),
      this.database.select({ value: count() }).from(checkins).innerJoin(events, eq(checkins.eventId, events.id)).where(and(...eventFilters)),
      this.database.select().from(events).where(and(...eventFilters, gte(events.startAt, new Date()))).orderBy(events.startAt).limit(5),
      this.database.select({ registration: registrations, participant: participants, event: events }).from(registrations)
        .innerJoin(events, eq(registrations.eventId, events.id)).innerJoin(participants, eq(registrations.participantId, participants.id))
        .where(and(...registrationFilters, isNull(registrations.deletedAt))).orderBy(desc(registrations.createdAt)).limit(6),
    ]);
    const stats = registrationStats[0];
    const confirmed = Number(stats?.confirmed ?? 0);
    const checkedIn = Number(checkinStats[0]?.value ?? 0);
    const upcomingEvents = await Promise.all(upcomingRows.map((event) => this.upcomingMetric(event)));
    return {
      events: Number(eventCountRow[0]?.value ?? 0),
      registrations: Number(stats?.registrations ?? 0),
      confirmed,
      pending: Number(stats?.pending ?? 0),
      waitlisted: Number(stats?.waitlisted ?? 0),
      checkedIn,
      revenueExpectedCents: Number(stats?.expectedCents ?? 0),
      revenuePaidCents: Number(paidStats[0]?.value ?? 0),
      attendanceRate: confirmed ? Math.round((checkedIn / confirmed) * 1000) / 10 : 0,
      upcomingEvents,
      recentRegistrations: recentRows.map((row) => ({ code: row.registration.code, participantName: row.participant.name, eventTitle: row.event.title, status: row.registration.status, createdAt: row.registration.createdAt, amountCents: row.registration.finalCents })),
    };
  }

  async report(params: ReportParams): Promise<RevenueReport> {
    const filters = this.registrationFilters(params.userId, params.canViewAll);
    if (params.eventId) filters.push(eq(registrations.eventId, params.eventId));
    if (params.from) filters.push(gte(registrations.createdAt, params.from));
    if (params.to) filters.push(lte(registrations.createdAt, params.to));
    const [totals] = await this.database.select({
      total: count(),
      confirmed: sql<number>`count(*) filter (where ${registrations.status} = 'confirmada')`,
      waiting: sql<number>`count(*) filter (where ${registrations.status} in ('pendente', 'aguardando_pagamento'))`,
      cancelled: sql<number>`count(*) filter (where ${registrations.status} = 'cancelada')`,
      waitlisted: sql<number>`count(*) filter (where ${registrations.status} = 'lista_espera')`,
      expectedCents: sql<number>`coalesce(sum(${registrations.finalCents}) filter (where ${registrations.status} in ('confirmada', 'pendente', 'aguardando_pagamento')), 0)`,
      paidCents: sql<number>`coalesce(sum(${payments.amountCents}) filter (where ${payments.status} = 'pago'), 0)`,
      checkedIn: sql<number>`count(distinct ${checkins.registrationId}) filter (where ${checkins.type} = 'normal')`,
    }).from(registrations).innerJoin(events, eq(registrations.eventId, events.id))
      .leftJoin(payments, eq(registrations.id, payments.registrationId))
      .leftJoin(checkins, and(eq(registrations.id, checkins.registrationId), eq(checkins.type, "normal")))
      .where(and(...filters, isNull(registrations.deletedAt)));
    const companyRows = await this.database.select({ company: participants.company, quantity: count() }).from(registrations)
      .innerJoin(events, eq(registrations.eventId, events.id)).innerJoin(participants, eq(registrations.participantId, participants.id))
      .where(and(...filters, isNull(registrations.deletedAt), sql`${participants.company} is not null`))
      .groupBy(participants.company).orderBy(desc(count())).limit(10);
    const confirmed = Number(totals?.confirmed ?? 0);
    return {
      totalRegistrations: Number(totals?.total ?? 0),
      confirmed,
      waiting: Number(totals?.waiting ?? 0),
      cancelled: Number(totals?.cancelled ?? 0),
      waitlisted: Number(totals?.waitlisted ?? 0),
      paidCents: Number(totals?.paidCents ?? 0),
      expectedCents: Number(totals?.expectedCents ?? 0),
      attendanceRate: confirmed ? Math.round((Number(totals?.checkedIn ?? 0) / confirmed) * 1000) / 10 : 0,
      byCompany: companyRows.map((row) => ({ company: row.company ?? "Não informado", count: Number(row.quantity) })),
    };
  }

  private eventFilters(userId: string, canViewAll: boolean) {
    const filters = [isNull(events.deletedAt)];
    if (!canViewAll) filters.push(eq(events.createdByGlobalUserId, userId));
    return filters;
  }

  private registrationFilters(userId: string, canViewAll: boolean) {
    const filters = [isNull(events.deletedAt)];
    if (!canViewAll) filters.push(eq(events.createdByGlobalUserId, userId));
    return filters;
  }

  private async upcomingMetric(event: typeof events.$inferSelect) {
    const [counts] = await this.database.select({
      confirmed: sql<number>`count(*) filter (where ${registrations.status} = 'confirmada')`,
      reserved: sql<number>`count(*) filter (where ${registrations.status} in ('pendente', 'aguardando_pagamento') and ${registrations.reservationExpiresAt} > now())`,
    }).from(registrations).where(and(eq(registrations.eventId, event.id), isNull(registrations.deletedAt)));
    return { id: event.id, title: event.title, slug: event.slug, startAt: event.startAt, status: event.status, capacity: event.maxCapacity, confirmed: Number(counts?.confirmed ?? 0), reserved: Number(counts?.reserved ?? 0) };
  }
}
