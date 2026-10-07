import "server-only";
import { and, eq } from "drizzle-orm";
import { CheckInRepository } from "@/modules/ticketing/domain/repositories/checkin-repository.interface";
import type { CheckInContext, CheckInContextParams, CheckInResult, CreateCheckInParams } from "@/modules/ticketing/domain/repositories/checkin-repository.interface";
import { checkins, events, participants, registrations } from "@/server/infrastructure/persistence/schema";
import { readEnvironment } from "@/server/config/environment.config";
import type { Database } from "@/server/infrastructure/persistence/database";

export type DrizzleCheckInRepositoryDependencies = { database: Database };
type CheckInLookupRow = {
  registrationCode: string;
  registrationStatus: string;
  eventId: string;
  eventTitle: string;
  eventStatus: string;
  eventStartAt: Date;
  eventEndAt: Date;
  participantName: string;
  previousCheckInAt: Date | null;
  previousCheckInBy: string | null;
};

export class DrizzleCheckInRepository extends CheckInRepository {
  private readonly database: Database;
  constructor(dependencies: DrizzleCheckInRepositoryDependencies) {
    super();
    this.database = dependencies.database;
  }

  async findContext(params: CheckInContextParams): Promise<CheckInContext | null> {
    const row = await this.findLookupRow(params.registrationId);
    if (!row) return null;
    return {
      registrationCode: row.registrationCode,
      registrationStatus: row.registrationStatus,
      eventId: row.eventId,
      eventTitle: row.eventTitle,
      eventStatus: row.eventStatus,
      eventStartAt: row.eventStartAt,
      eventEndAt: row.eventEndAt,
      eventDayMatches: isWithinEventLocalDates({ at: params.at, startAt: row.eventStartAt, endAt: row.eventEndAt, timeZone: readEnvironment().appTimezone }),
      participantName: row.participantName,
      alreadyCheckedIn: row.previousCheckInAt !== null,
      previousCheckInAt: row.previousCheckInAt,
      previousCheckInBy: row.previousCheckInBy,
    };
  }

  async create(params: CreateCheckInParams): Promise<CheckInResult> {
    try {
      return await this.database.transaction(async (transaction) => {
        const [registration] = await transaction.select({ registration: registrations, event: events, participant: participants }).from(registrations)
          .innerJoin(events, eq(registrations.eventId, events.id))
          .innerJoin(participants, eq(registrations.participantId, participants.id))
          .where(eq(registrations.id, params.registrationId)).for("update").limit(1);
        if (!registration || registration.registration.status !== "confirmada") {
          return { accepted: false, registrationCode: registration?.registration.code ?? "", participantName: registration?.participant.name ?? "", eventTitle: registration?.event.title ?? "", happenedAt: params.at, operatorName: params.operatorName, reason: "A inscrição deixou de estar confirmada.", previousCheckInAt: null };
        }
        const [previous] = await transaction.select({ happenedAt: checkins.happenedAt }).from(checkins).where(and(eq(checkins.registrationId, params.registrationId), eq(checkins.type, "normal"))).limit(1);
        await transaction.insert(checkins).values({
          registrationId: params.registrationId,
          eventId: registration.event.id,
          operatorGlobalUserId: params.operatorId,
          operatorName: params.operatorName,
          happenedAt: params.at,
          type: params.type,
          justification: params.justification,
          createdAt: params.at,
        });
        return { accepted: true, registrationCode: registration.registration.code, participantName: registration.participant.name, eventTitle: registration.event.title, happenedAt: params.at, operatorName: params.operatorName, reason: null, previousCheckInAt: previous?.happenedAt ?? null };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const row = await this.findLookupRow(params.registrationId);
        return { accepted: false, registrationCode: row?.registrationCode ?? "", participantName: row?.participantName ?? "", eventTitle: row?.eventTitle ?? "", happenedAt: params.at, operatorName: params.operatorName, reason: row?.previousCheckInAt ? `Check-in já realizado em ${row.previousCheckInAt.toLocaleString("pt-BR")} por ${row.previousCheckInBy ?? "outro operador"}.` : "Check-in já realizado para esta inscrição.", previousCheckInAt: row?.previousCheckInAt ?? null };
      }
      throw error;
    }
  }

  private async findLookupRow(registrationId: string): Promise<CheckInLookupRow | null> {
    const [row] = await this.database.select({
      registrationCode: registrations.code,
      registrationStatus: registrations.status,
      eventId: events.id,
      eventTitle: events.title,
      eventStatus: events.status,
      eventStartAt: events.startAt,
      eventEndAt: events.endAt,
      participantName: participants.name,
      previousCheckInAt: checkins.happenedAt,
      previousCheckInBy: checkins.operatorName,
    }).from(registrations)
      .innerJoin(events, eq(registrations.eventId, events.id))
      .innerJoin(participants, eq(registrations.participantId, participants.id))
      .leftJoin(checkins, and(eq(registrations.id, checkins.registrationId), eq(checkins.type, "normal")))
      .where(eq(registrations.id, registrationId)).limit(1);
    return row ?? null;
  }
}

export type LocalEventDayParams = { at: Date; startAt: Date; endAt: Date; timeZone: string };

function isWithinEventLocalDates(params: LocalEventDayParams): boolean {
  const currentDay = formatLocalDay({ value: params.at, timeZone: params.timeZone });
  const firstDay = formatLocalDay({ value: params.startAt, timeZone: params.timeZone });
  const lastDay = formatLocalDay({ value: params.endAt, timeZone: params.timeZone });
  return currentDay >= firstDay && currentDay <= lastDay;
}

export type FormatLocalDayParams = { value: Date; timeZone: string };

function formatLocalDay(params: FormatLocalDayParams): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: params.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(params.value);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
