import "server-only";
import { and, desc, eq, ilike, isNull } from "drizzle-orm";
import { CheckInRepository } from "@/modules/ticketing/domain/repositories/checkin-repository.interface";
import type {
  CancelCheckInParams,
  CancelCheckInResult,
  CheckInContext,
  CheckInContextParams,
  CheckInResult,
  CreateCheckInParams,
} from "@/modules/ticketing/domain/repositories/checkin-repository.interface";
import { Result } from "@/@core/domain/result";
import type { DomainError } from "@/@core/domain/errors/domain-error.base";
import { CheckInRuleError } from "@/modules/ticketing/domain/services/check-in.domain-service";
import { checkins, events, participants, registrations } from "@/server/infrastructure/persistence/schema";
import { readEnvironment } from "@/server/config/environment.config";
import type { Database } from "@/server/infrastructure/persistence/database";

export type DrizzleCheckInRepositoryDependencies = { database: Database };
type CheckInLookupRow = {
  registrationId: string;
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
    const row = await this.findLookupRow({
      registrationId: params.registrationId,
      registrationCode: params.registrationCode,
    });
    if (!row) return null;
    return {
      registrationId: row.registrationId,
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
        const row = await this.findLookupRow({ registrationId: params.registrationId });
        return { accepted: false, registrationCode: row?.registrationCode ?? "", participantName: row?.participantName ?? "", eventTitle: row?.eventTitle ?? "", happenedAt: params.at, operatorName: params.operatorName, reason: row?.previousCheckInAt ? `Check-in já realizado em ${row.previousCheckInAt.toLocaleString("pt-BR")} por ${row.previousCheckInBy ?? "outro operador"}.` : "Check-in já realizado para esta inscrição.", previousCheckInAt: row?.previousCheckInAt ?? null };
      }
      throw error;
    }
  }

  async cancelCheckIn(
    params: CancelCheckInParams,
  ): Promise<Result<CancelCheckInResult, DomainError>> {
    return this.database.transaction(async (transaction) => {
      const accessFilters = [
        eq(registrations.id, params.registrationId),
        isNull(registrations.deletedAt),
      ];
      if (!params.canManageAll) {
        accessFilters.push(eq(events.createdByGlobalUserId, params.actorId));
      }

      const [row] = await transaction
        .select({
          registration: registrations,
          event: events,
          participant: participants,
        })
        .from(registrations)
        .innerJoin(events, eq(registrations.eventId, events.id))
        .innerJoin(participants, eq(registrations.participantId, participants.id))
        .where(and(...accessFilters))
        .for("update")
        .limit(1);

      if (!row) {
        return Result.fail(
          new CheckInRuleError({
            code: "REGISTRATION_NOT_FOUND",
            message:
              "Inscrição não encontrada ou você não tem permissão para gerenciá-la.",
          }),
        );
      }

      if (row.registration.status !== "confirmada") {
        return Result.fail(
          new CheckInRuleError({
            code: "REGISTRATION_NOT_CONFIRMED",
            message: "Apenas inscrições confirmadas permitem cancelar check-in.",
          }),
        );
      }

      const checkInFilters = [eq(checkins.registrationId, params.registrationId)];
      if (params.checkInId) {
        checkInFilters.push(eq(checkins.id, params.checkInId));
      }

      const checkInRows = await transaction
        .select()
        .from(checkins)
        .where(and(...checkInFilters))
        .orderBy(desc(checkins.happenedAt))
        .limit(1);

      if (!checkInRows.length) {
        return Result.fail(
          new CheckInRuleError({
            code: "CHECKIN_NOT_FOUND",
            message: "Nenhum check-in encontrado para esta inscrição.",
          }),
        );
      }

      const target = checkInRows[0];

      await transaction.delete(checkins).where(eq(checkins.id, target.id));

      return Result.ok({
        registrationId: row.registration.id,
        registrationCode: row.registration.code,
        participantName: row.participant.name,
        cancelledCheckInId: target.id,
        checkInType: target.type,
        happenedAt: target.happenedAt,
        operatorName: target.operatorName,
      });
    });
  }

  private async findLookupRow(lookup: {
    registrationId?: string;
    registrationCode?: string;
  }): Promise<CheckInLookupRow | null> {
    const condition = lookup.registrationId
      ? eq(registrations.id, lookup.registrationId)
      : lookup.registrationCode
        ? ilike(registrations.code, lookup.registrationCode.trim())
        : null;

    if (!condition) return null;

    const [row] = await this.database.select({
      registrationId: registrations.id,
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
      .where(condition).limit(1);
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
