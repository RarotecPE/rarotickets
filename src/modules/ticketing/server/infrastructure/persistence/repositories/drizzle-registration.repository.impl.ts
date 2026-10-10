import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { Identifier } from "@/@core/domain/identifier";
import { Result } from "@/@core/domain/result";
import {
  Registration,
  RegistrationRuleError,
} from "@/modules/ticketing/domain/registrations/entities/registration.aggregate";
import { RegistrationRepository } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import type {
  AttachCheckoutParams,
  CancelRegistrationParams,
  CancelRegistrationResult,
  CreatePublicRegistrationOutput,
  CreatePublicRegistrationParams,
  ExpireReservationsParams,
  ExpireReservationsResult,
  FindNextWaitlistedParams,
  FindPortalRegistrationParams,
  PromoteNextWaitlistedParams,
  WaitlistCandidate,
  WaitlistPromotionResult,
  FindPrivateRegistrationFileParams,
  PrivateRegistrationFile,
  CheckoutDetailsParams,
  ParticipantCheckoutDetails,
  FindRegistrationNotificationParams,
  RegistrationNotificationDetails,
  ListRegistrationsParams,
  MockPaymentParams,
  ParticipantPortalView,
  PaymentWebhookUpdateParams,
  PaymentWebhookUpdateResult,
  PublicRegistrationResult,
  RegistrationListItem,
  RegistrationListResult,
} from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import { PricingDomainService } from "@/modules/ticketing/domain/registrations/services/pricing.domain-service";
import {
  events,
  coupons,
  participants,
  payments,
  paymentWebhookEvents,
  registrations,
  ticketLots,
  checkins,
  certificates,
  registrationFiles,
} from "@/server/infrastructure/persistence/schema";
import type { Database } from "@/server/infrastructure/persistence/database";
import * as schema from "@/server/infrastructure/persistence/schema";
import type { PostgresJsTransaction } from "drizzle-orm/postgres-js";
import type { ExtractTablesWithRelations } from "drizzle-orm";

export type DrizzleRegistrationRepositoryDependencies = { database: Database };
type RegistrationDraft = {
  lotId: string | null;
  couponId: string | null;
  status: "lista_espera" | "confirmada" | "aguardando_pagamento";
  originalCents: number;
  discountCents: number;
  finalCents: number;
  reservationExpiresAt: Date | null;
  paymentId: string | null;
};
type EventForRegistration = {
  id: string;
  title: string;
  slug: string;
  startAt: Date;
  endAt: Date;
  status: string;
  modality: string;
  onlineUrl: string | null;
  chargeType: string;
  maxCapacity: number;
  allowsWaitlist: boolean;
  registrationStartAt: Date;
  registrationEndAt: Date;
};
type ParticipantIdentity = { id: string | null; conflict: boolean };
type ParticipantRecord = { id: string };
type FindCurrentLotParams = {
  transaction: DrizzleTransaction;
  event: EventForRegistration;
  at: Date;
  selectedLotId: string | null;
};
type DrizzleTransaction = PostgresJsTransaction<
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export class DrizzleRegistrationRepository extends RegistrationRepository {
  private readonly database: Database;
  private readonly pricingService: PricingDomainService;

  constructor(dependencies: DrizzleRegistrationRepositoryDependencies) {
    super();
    this.database = dependencies.database;
    this.pricingService = new PricingDomainService();
  }

  async createPublic(
    params: CreatePublicRegistrationParams,
  ): Promise<CreatePublicRegistrationOutput> {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select id from events where id = ${params.eventId} for update`,
      );
      const [eventRow] = await transaction
        .select()
        .from(events)
        .where(and(eq(events.id, params.eventId), isNull(events.deletedAt)))
        .limit(1);
      if (!eventRow)
        return this.fail("EVENT_NOT_FOUND", "Evento não encontrado.");
      const event = toEventForRegistration(eventRow);
      if (!isRegistrationWindowOpen(event, params.at))
        return this.fail(
          "REGISTRATION_CLOSED",
          "As inscrições deste evento estão fechadas.",
        );

      const expiredReservations = await transaction
        .select({ id: registrations.id })
        .from(registrations)
        .where(
          and(
            eq(registrations.eventId, event.id),
            inArray(registrations.status, ["pendente", "aguardando_pagamento"]),
            lte(registrations.reservationExpiresAt, params.at),
            isNull(registrations.deletedAt),
          ),
        );
      if (expiredReservations.length) {
        const expiredIds = expiredReservations.map((row) => row.id);
        await transaction
          .update(registrations)
          .set({
            status: "cancelada",
            cancellationReason: "Reserva expirada",
            reservationExpiresAt: null,
            waitlistExpiresAt: null,
            confirmedAt: null,
            updatedAt: params.at,
          })
          .where(inArray(registrations.id, expiredIds));
        await transaction
          .update(payments)
          .set({ status: "expirado", updatedAt: params.at })
          .where(
            and(
              inArray(payments.registrationId, expiredIds),
              eq(payments.status, "aguardando"),
            ),
          );
      }

      const participantIdentity = await this.findParticipantIdentity(
        transaction,
        params,
      );
      if (participantIdentity.conflict)
        return this.fail(
          "PARTICIPANT_CONFLICT",
          "Este CPF ou e-mail já está vinculado a outro cadastro. Procure o atendimento.",
        );
      const participantId = participantIdentity.id ?? params.participantId;
      const [duplicate] = await transaction
        .select({ id: registrations.id })
        .from(registrations)
        .where(
          and(
            eq(registrations.eventId, event.id),
            eq(registrations.participantId, participantId),
            inArray(registrations.status, [
              "confirmada",
              "pendente",
              "aguardando_pagamento",
            ]),
            isNull(registrations.deletedAt),
          ),
        )
        .limit(1);
      if (duplicate)
        return this.fail(
          "DUPLICATE_EVENT_REGISTRATION",
          "Este CPF já possui uma inscrição ativa neste evento.",
        );

      const capacity = await this.countActiveSeats(
        transaction,
        event.id,
        params.at,
      );
      const available = Math.max(
        0,
        event.maxCapacity - capacity.confirmed - capacity.reserved,
      );
      const [firstWaitlisted] = await transaction
        .select({ id: registrations.id })
        .from(registrations)
        .where(
          and(
            eq(registrations.eventId, event.id),
            eq(registrations.status, "lista_espera"),
            isNull(registrations.deletedAt),
          ),
        )
        .orderBy(asc(registrations.createdAt), asc(registrations.id))
        .limit(1);
      const waitlistHasPriority = Boolean(firstWaitlisted);
      let draft: RegistrationDraft;
      if (available === 0 || waitlistHasPriority) {
        if (!event.allowsWaitlist)
          return this.fail(
            waitlistHasPriority ? "WAITLIST_HAS_PRIORITY" : "EVENT_CAPACITY_REACHED",
            waitlistHasPriority
              ? "Há participantes na lista de espera que devem ser atendidos primeiro."
              : "As vagas deste evento se esgotaram.",
          );
        draft = {
          lotId: null,
          couponId: null,
          status: "lista_espera",
          originalCents: 0,
          discountCents: 0,
          finalCents: 0,
          reservationExpiresAt: null,
          paymentId: null,
        };
      } else {
        if (event.chargeType === "pago" && !params.lotId)
          return this.fail(
            "TICKET_LOT_REQUIRED",
            "Selecione um lote de ingresso.",
          );
        const lot = await this.findCurrentLot({
          transaction,
          event,
          at: params.at,
          selectedLotId: params.lotId,
        });
        if (event.chargeType === "pago" && !lot)
          return this.fail(
            "NO_ACTIVE_TICKET_LOT",
            "Não há lote de ingresso ativo neste momento.",
          );
        const coupon = await this.findCoupon(
          transaction,
          params.couponCode,
          event.id,
          params.at,
        );
        if (params.couponCode && !coupon)
          return this.fail(
            "COUPON_UNAVAILABLE",
            "Cupom inválido, inativo ou fora da validade.",
          );
        if (coupon && coupon.maxUses !== null) {
          const [held] = await transaction
            .select({ value: count() })
            .from(registrations)
            .where(
              and(
                eq(registrations.couponId, coupon.id),
                inArray(registrations.status, [
                  "pendente",
                  "aguardando_pagamento",
                ]),
                gt(registrations.reservationExpiresAt, params.at),
                isNull(registrations.deletedAt),
              ),
            );
          if (coupon.usedCount + Number(held?.value ?? 0) >= coupon.maxUses)
            return this.fail(
              "COUPON_LIMIT_REACHED",
              "Este cupom atingiu o limite de utilizações.",
            );
        }
        const originalCents =
          event.chargeType === "gratuito" ? 0 : (lot?.priceCents ?? 0);
        const pricingResult = this.pricingService.execute({
          originalCents,
          discountType: coupon?.type,
          discountValue: coupon?.discountValue,
        });
        if (pricingResult.isFailure)
          return this.fail("INVALID_PRICE", pricingResult.error.message);
        const calculated = pricingResult.value;
        const isFree =
          event.chargeType === "gratuito" || calculated.finalCents === 0;
        draft = {
          lotId: lot?.id ?? null,
          couponId: coupon?.id ?? null,
          status: isFree ? "confirmada" : "aguardando_pagamento",
          originalCents: calculated.originalCents,
          discountCents: calculated.discountCents,
          finalCents: calculated.finalCents,
          reservationExpiresAt: isFree
            ? null
            : new Date(params.at.getTime() + 15 * 60 * 1000),
          paymentId: null,
        };
      }

      const participant = await this.saveParticipant(
        transaction,
        params,
        participantIdentity.id,
      );
      const registrationProps = {
        code: params.registrationCode,
        eventId: event.id,
        participantId: participant.id,
        lotId: draft.lotId,
        couponId: draft.couponId,
        answersSnapshot: { ...params.answers },
        originalCents: draft.originalCents,
        discountCents: draft.discountCents,
        finalCents: draft.finalCents,
        status: draft.status,
        reservationExpiresAt: draft.reservationExpiresAt,
        waitlistExpiresAt: null,
        accessTokenHash: params.accessTokenHash,
        credentialTokenHash: null,
        cancellationReason: null,
        confirmedAt: draft.status === "confirmada" ? params.at : null,
        deletedAt: null,
      };
      const registrationResult = Registration.create({
        id: Identifier.fromExisting(params.registrationId),
        props: registrationProps,
        createdAt: params.at,
        updatedAt: params.at,
      });
      if (registrationResult.isFailure)
        return this.fail(
          registrationResult.error.code,
          registrationResult.error.message,
        );
      await transaction.insert(registrations).values({
        id: params.registrationId,
        code: params.registrationCode,
        eventId: event.id,
        participantId: participant.id,
        lotId: draft.lotId,
        couponId: draft.couponId,
        answersSnapshot: registrationProps.answersSnapshot,
        originalCents: draft.originalCents,
        discountCents: draft.discountCents,
        finalCents: draft.finalCents,
        status: draft.status,
        reservationExpiresAt: draft.reservationExpiresAt,
        accessTokenHash: params.accessTokenHash,
        confirmedAt: draft.status === "confirmada" ? params.at : null,
        createdAt: params.at,
        updatedAt: params.at,
      });
      if (params.files.length)
        await transaction.insert(registrationFiles).values(
          params.files.map((file) => ({
            id: file.id,
            registrationId: params.registrationId,
            fieldId: file.fieldId,
            storageKey: file.storageKey,
            originalName: file.originalName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            private: true,
            createdAt: params.at,
            updatedAt: params.at,
          })),
        );

      if (draft.status === "confirmada" && draft.couponId) {
        await transaction
          .update(coupons)
          .set({
            usedCount: sql`${coupons.usedCount} + 1`,
            updatedAt: params.at,
          })
          .where(eq(coupons.id, draft.couponId));
      }
      let paymentId: string | null = null;
      if (draft.status === "aguardando_pagamento") {
        const [payment] = await transaction
          .insert(payments)
          .values({
            registrationId: params.registrationId,
            referenceId: params.registrationId,
            provider: "pagbank",
            status: "aguardando",
            amountCents: draft.finalCents,
            createdAt: params.at,
            updatedAt: params.at,
          })
          .returning({ id: payments.id });
        paymentId = payment?.id ?? null;
      }
      return Result.ok<PublicRegistrationResult, RegistrationRuleError>({
        registrationId: params.registrationId,
        registrationCode: params.registrationCode,
        participantTaxId: params.participant.cpf,
        eventTitle: event.title,
        eventSlug: event.slug,
        eventStartAt: event.startAt,
        participantName: params.participant.name,
        participantEmail: params.participant.email,
        participantPhone: params.participant.phone,
        status: draft.status,
        originalCents: draft.originalCents,
        discountCents: draft.discountCents,
        finalCents: draft.finalCents,
        reservationExpiresAt: draft.reservationExpiresAt,
        waitlistExpiresAt: null,
        paymentId,
        paymentExternalId: null,
        checkoutUrl: null,
        accessTokenHash: params.accessTokenHash,
        shouldCreateCheckout: draft.status === "aguardando_pagamento",
      });
    });
  }

  async attachCheckout(params: AttachCheckoutParams): Promise<void> {
    await this.database
      .update(payments)
      .set({
        provider: params.provider,
        externalId: params.externalId,
        checkoutUrl: params.checkoutUrl,
        updatedAt: params.at,
      })
      .where(
        and(
          eq(payments.id, params.paymentId),
          eq(payments.registrationId, params.registrationId),
        ),
      );
  }

  async findPortal(
    params: FindPortalRegistrationParams,
  ): Promise<ParticipantPortalView | null> {
    const [row] = await this.database
      .select({
        registration: registrations,
        participant: participants,
        event: events,
        lot: ticketLots,
        payment: payments,
        certificate: certificates,
      })
      .from(registrations)
      .innerJoin(participants, eq(registrations.participantId, participants.id))
      .innerJoin(events, eq(registrations.eventId, events.id))
      .leftJoin(ticketLots, eq(registrations.lotId, ticketLots.id))
      .leftJoin(payments, eq(registrations.id, payments.registrationId))
      .leftJoin(certificates, eq(registrations.id, certificates.registrationId))
      .where(
        and(
          eq(registrations.accessTokenHash, params.accessTokenHash),
          isNull(registrations.deletedAt),
          isNull(events.deletedAt),
        ),
      )
      .limit(1);
    if (!row) return null;
    const event = row.event;
    const registration = row.registration;
    const isConfirmed = registration.status === "confirmada";
    const reservationActive =
      registration.reservationExpiresAt !== null &&
      registration.reservationExpiresAt > new Date();
    const location =
      event.modality === "presencial"
        ? [
            event.addressStreet,
            event.addressNumber,
            event.addressMunicipality,
            event.addressState,
          ]
            .filter(Boolean)
            .join(", ")
        : null;
    return {
      registrationId: registration.id,
      code: registration.code,
      status: registration.status,
      name: row.participant.name,
      email: row.participant.email,
      eventId: event.id,
      eventTitle: event.title,
      eventSlug: event.slug,
      eventStartAt: event.startAt,
      eventEndAt: event.endAt,
      modality: event.modality,
      onlineUrl: isConfirmed ? event.onlineUrl : null,
      location,
      lotName: row.lot?.name ?? null,
      originalCents: registration.originalCents,
      discountCents: registration.discountCents,
      finalCents: registration.finalCents,
      reservationExpiresAt: registration.reservationExpiresAt,
      waitlistExpiresAt: registration.waitlistExpiresAt,
      credentialToken: null,
      qrPayload: null,
      checkoutUrl: reservationActive
        ? (row.payment?.checkoutUrl ?? null)
        : null,
      paymentProvider: row.payment?.provider ?? null,
      paymentExternalId: row.payment?.externalId ?? null,
      certificateCode: row.certificate?.authenticationCode ?? null,
      certificateIssuedAt: row.certificate?.issuedAt ?? null,
    };
  }

  async findCheckoutDetails(
    params: CheckoutDetailsParams,
  ): Promise<ParticipantCheckoutDetails | null> {
    const [row] = await this.database
      .select({
        registration: registrations,
        participant: participants,
        event: events,
        payment: payments,
      })
      .from(registrations)
      .innerJoin(participants, eq(registrations.participantId, participants.id))
      .innerJoin(events, eq(registrations.eventId, events.id))
      .leftJoin(payments, eq(registrations.id, payments.registrationId))
      .where(
        and(
          eq(registrations.accessTokenHash, params.accessTokenHash),
          inArray(registrations.status, ["aguardando_pagamento", "pendente"]),
          isNull(registrations.deletedAt),
          isNull(events.deletedAt),
        ),
      )
      .limit(1);
    if (!row) return null;
    return {
      registrationId: row.registration.id,
      registrationCode: row.registration.code,
      status: row.registration.status,
      expiresAt:
        row.registration.waitlistExpiresAt ?? row.registration.reservationExpiresAt,
      paymentId: row.payment?.id ?? null,
      checkoutUrl: row.payment?.checkoutUrl ?? null,
      amountCents: row.registration.finalCents,
      customerName: row.participant.name,
      customerEmail: row.participant.email,
      customerTaxId: row.participant.cpf ?? "",
      customerPhone: row.participant.phone,
      eventTitle: row.event.title,
    };
  }

  async findNotificationDetails(
    params: FindRegistrationNotificationParams,
  ): Promise<RegistrationNotificationDetails | null> {
    const [row] = await this.database
      .select({
        registration: registrations,
        participant: participants,
        event: events,
        lot: ticketLots,
        payment: payments,
      })
      .from(registrations)
      .innerJoin(participants, eq(registrations.participantId, participants.id))
      .innerJoin(events, eq(registrations.eventId, events.id))
      .leftJoin(ticketLots, eq(registrations.lotId, ticketLots.id))
      .leftJoin(payments, eq(registrations.id, payments.registrationId))
      .where(eq(registrations.code, params.registrationCode))
      .limit(1);
    if (!row) return null;
    const event = row.event;
    const location =
      event.modality === "presencial"
        ? [
            event.addressStreet,
            event.addressNumber,
            event.addressMunicipality,
            event.addressState,
          ]
            .filter(Boolean)
            .join(", ") || null
        : null;
    return {
      registrationId: row.registration.id,
      registrationCode: row.registration.code,
      status: row.registration.status,
      participantName: row.participant.name,
      participantEmail: row.participant.email,
      participantPhone: row.participant.phone,
      eventTitle: row.event.title,
      eventStartAt: row.event.startAt,
      eventEndAt: row.event.endAt,
      modality: row.event.modality,
      location,
      onlineUrl: row.event.onlineUrl,
      lotName: row.lot?.name ?? null,
      originalCents: row.registration.originalCents,
      discountCents: row.registration.discountCents,
      finalCents: row.registration.finalCents,
      paymentProvider: row.payment?.provider ?? null,
      paymentExternalId: row.payment?.externalId ?? null,
      paidAt: row.payment?.paidAt ?? row.registration.confirmedAt ?? null,
    };
  }

  async findPrivateFile(
    params: FindPrivateRegistrationFileParams,
  ): Promise<PrivateRegistrationFile | null> {
    const filters = [
      eq(registrationFiles.id, params.fileId),
      eq(registrationFiles.private, true),
      isNull(registrations.deletedAt),
      isNull(events.deletedAt),
    ];
    if (!params.canViewAll)
      filters.push(eq(events.createdByGlobalUserId, params.userId));
    const [row] = await this.database
      .select({ file: registrationFiles, eventId: events.id })
      .from(registrationFiles)
      .innerJoin(
        registrations,
        eq(registrationFiles.registrationId, registrations.id),
      )
      .innerJoin(events, eq(registrations.eventId, events.id))
      .where(and(...filters))
      .limit(1);
    if (!row) return null;
    return {
      id: row.file.id,
      storageKey: row.file.storageKey,
      originalName: row.file.originalName,
      mimeType: row.file.mimeType,
      sizeBytes: row.file.sizeBytes,
      eventId: row.eventId,
    };
  }

  async list(params: ListRegistrationsParams): Promise<RegistrationListResult> {
    const filters = [isNull(registrations.deletedAt)];
    if (params.eventId) filters.push(eq(registrations.eventId, params.eventId));
    if (!params.canViewAll)
      filters.push(eq(events.createdByGlobalUserId, params.userId));
    if (params.status)
      filters.push(
        eq(
          registrations.status,
          params.status as typeof registrations.$inferSelect.status,
        ),
      );
    if (params.query?.trim()) {
      const query = `%${params.query.trim()}%`;
      filters.push(
        or(
          ilike(registrations.code, query),
          ilike(participants.name, query),
          ilike(participants.email, query),
          ilike(participants.cpf, query),
        )!,
      );
    }
    const offset =
      (Math.max(params.page, 1) - 1) *
      Math.min(Math.max(params.pageSize, 1), 100);
    const [totalRow] = await this.database
      .select({ value: count() })
      .from(registrations)
      .innerJoin(events, eq(registrations.eventId, events.id))
      .innerJoin(participants, eq(registrations.participantId, participants.id))
      .where(and(...filters));
    const rows = await this.database
      .select({
        registration: registrations,
        event: events,
        participant: participants,
        checkin: checkins,
      })
      .from(registrations)
      .innerJoin(events, eq(registrations.eventId, events.id))
      .innerJoin(participants, eq(registrations.participantId, participants.id))
      .leftJoin(
        checkins,
        and(
          eq(registrations.id, checkins.registrationId),
          eq(checkins.type, "normal"),
        ),
      )
      .where(and(...filters))
      .orderBy(desc(registrations.createdAt))
      .limit(Math.min(Math.max(params.pageSize, 1), 100))
      .offset(offset);
    const items: RegistrationListItem[] = rows.map((row) => ({
      id: row.registration.id,
      code: row.registration.code,
      eventId: row.event.id,
      eventTitle: row.event.title,
      participantId: row.participant.id,
      participantName: row.participant.name,
      participantEmail: row.participant.email,
      participantPhone: row.participant.phone,
      cpf: row.participant.cpf ?? "",
      status: row.registration.status,
      finalCents: row.registration.finalCents,
      createdAt: row.registration.createdAt,
      checkInAt: row.checkin?.happenedAt ?? null,
      checkInBy: row.checkin?.operatorName ?? null,
    }));
    return { items, total: Number(totalRow?.value ?? 0) };
  }

  async cancel(
    params: CancelRegistrationParams,
  ): Promise<CancelRegistrationResult | null> {
    return this.database.transaction(async (transaction) => {
      const accessFilters = [
        eq(registrations.id, params.registrationId),
        isNull(registrations.deletedAt),
      ];
      if (!params.canManageAll)
        accessFilters.push(eq(events.createdByGlobalUserId, params.actorId));
      const [row] = await transaction
        .select({ registration: registrations, event: events })
        .from(registrations)
        .innerJoin(events, eq(registrations.eventId, events.id))
        .where(and(...accessFilters))
        .for("update")
        .limit(1);
      if (!row || row.registration.status === "cancelada") return null;
      const seatReleased =
        row.registration.status === "confirmada" ||
        ((row.registration.status === "pendente" ||
          row.registration.status === "aguardando_pagamento") &&
          row.registration.reservationExpiresAt !== null &&
          row.registration.reservationExpiresAt > params.at);
      await transaction
        .update(registrations)
        .set({
          status: "cancelada",
          cancellationReason: params.reason,
          reservationExpiresAt: null,
          waitlistExpiresAt: null,
          confirmedAt: null,
          updatedAt: params.at,
        })
        .where(eq(registrations.id, params.registrationId));
      await transaction
        .update(payments)
        .set({ status: "cancelado", updatedAt: params.at })
        .where(
          and(
            eq(payments.registrationId, params.registrationId),
            eq(payments.status, "aguardando"),
          ),
        );
      return {
        registrationCode: row.registration.code,
        status: "cancelada",
        eventId: row.event.id,
        seatReleased,
      };
    });
  }

  async findNextWaitlisted(
    params: FindNextWaitlistedParams,
  ): Promise<WaitlistCandidate | null> {
    const [row] = await this.database
      .select({ registration: registrations, participant: participants, event: events })
      .from(registrations)
      .innerJoin(participants, eq(registrations.participantId, participants.id))
      .innerJoin(events, eq(registrations.eventId, events.id))
      .where(
        and(
          eq(registrations.eventId, params.eventId),
          eq(registrations.status, "lista_espera"),
          isNull(registrations.deletedAt),
          isNull(events.deletedAt),
        ),
      )
      .orderBy(asc(registrations.createdAt), asc(registrations.id))
      .limit(1);
    return row ? mapWaitlistCandidate(row) : null;
  }

  async promoteNextWaitlisted(
    params: PromoteNextWaitlistedParams,
  ): Promise<WaitlistPromotionResult | null> {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select id from events where id = ${params.eventId} for update`,
      );
      const [eventRow] = await transaction
        .select()
        .from(events)
        .where(and(eq(events.id, params.eventId), isNull(events.deletedAt)))
        .limit(1);
      if (!eventRow) return null;
      const event = toEventForRegistration(eventRow);
      if (!event.allowsWaitlist || !isRegistrationWindowOpen(event, params.at))
        return null;

      const [row] = await transaction
        .select({ registration: registrations, participant: participants })
        .from(registrations)
        .innerJoin(participants, eq(registrations.participantId, participants.id))
        .where(
          and(
            eq(registrations.eventId, params.eventId),
            eq(registrations.status, "lista_espera"),
            isNull(registrations.deletedAt),
          ),
        )
        .orderBy(asc(registrations.createdAt), asc(registrations.id))
        .for("update")
        .limit(1);
      if (!row || row.registration.id !== params.registrationId) return null;

      const hasCapacity = await this.hasAvailableCapacity(
        transaction,
        event.id,
        event.maxCapacity,
        params.at,
      );
      if (!hasCapacity) return null;

      const lot =
        event.chargeType === "pago"
          ? await this.findCurrentLot({
              transaction,
              event,
              at: params.at,
              selectedLotId: null,
            })
          : null;
      if (event.chargeType === "pago" && !lot) return null;
      const amountCents = lot?.priceCents ?? 0;
      const registration = Registration.reconstitute({
        id: Identifier.fromExisting(row.registration.id),
        createdAt: row.registration.createdAt,
        updatedAt: row.registration.updatedAt,
        props: {
          code: row.registration.code,
          eventId: row.registration.eventId,
          participantId: row.registration.participantId,
          lotId: row.registration.lotId,
          couponId: row.registration.couponId,
          answersSnapshot: row.registration.answersSnapshot,
          originalCents: row.registration.originalCents,
          discountCents: row.registration.discountCents,
          finalCents: row.registration.finalCents,
          status: row.registration.status,
          reservationExpiresAt: row.registration.reservationExpiresAt,
          waitlistExpiresAt: row.registration.waitlistExpiresAt,
          accessTokenHash: row.registration.accessTokenHash,
          credentialTokenHash: row.registration.credentialTokenHash,
          cancellationReason: row.registration.cancellationReason,
          confirmedAt: row.registration.confirmedAt,
          deletedAt: row.registration.deletedAt,
        },
      });
      const promotion = registration.promoteFromWaitlist({
        lotId: lot?.id ?? null,
        originalCents: amountCents,
        finalCents: amountCents,
        accessTokenHash: params.accessTokenHash,
        requiresPayment: event.chargeType === "pago",
        at: params.at,
        deadline: params.expiresAt,
      });
      if (promotion.isFailure) return null;
      const props = promotion.value.propsSnapshot;
      await transaction
        .update(registrations)
        .set({
          lotId: props.lotId,
          couponId: null,
          originalCents: props.originalCents,
          discountCents: props.discountCents,
          finalCents: props.finalCents,
          status: props.status,
          reservationExpiresAt: props.reservationExpiresAt,
          waitlistExpiresAt: props.waitlistExpiresAt,
          accessTokenHash: props.accessTokenHash,
          cancellationReason: null,
          confirmedAt: props.confirmedAt,
          updatedAt: params.at,
        })
        .where(
          and(
            eq(registrations.id, params.registrationId),
            eq(registrations.status, "lista_espera"),
          ),
        );
      if (props.status === "pendente") {
        await transaction.insert(payments).values({
          registrationId: row.registration.id,
          referenceId: row.registration.id,
          provider: params.paymentProvider,
          status: "aguardando",
          amountCents,
          createdAt: params.at,
          updatedAt: params.at,
        });
      }
      return {
        ...mapWaitlistCandidate({
          registration: { ...row.registration, lotId: props.lotId },
          participant: row.participant,
          event: eventRow,
        }),
        status: props.status as "confirmada" | "pendente",
        originalCents: props.originalCents,
        finalCents: props.finalCents,
        waitlistExpiresAt: props.waitlistExpiresAt,
      };
    });
  }

  async listWaitlistedEventIds(): Promise<string[]> {
    const rows = await this.database
      .select({ eventId: registrations.eventId })
      .from(registrations)
      .innerJoin(events, eq(registrations.eventId, events.id))
      .where(
        and(
          eq(registrations.status, "lista_espera"),
          isNull(registrations.deletedAt),
          isNull(events.deletedAt),
        ),
      )
      .groupBy(registrations.eventId)
      .orderBy(asc(registrations.eventId));
    return rows.map((row) => row.eventId);
  }

  async applyPaymentWebhook(
    params: PaymentWebhookUpdateParams,
  ): Promise<PaymentWebhookUpdateResult> {
    return this.database.transaction(async (transaction) => {
      const [webhook] = await transaction
        .insert(paymentWebhookEvents)
        .values({
          provider: params.provider,
          providerEventId: params.eventId,
          rawPayload: params.payload,
          createdAt: params.at,
        })
        .onConflictDoNothing()
        .returning({ id: paymentWebhookEvents.id });
      if (!webhook)
        return {
          duplicate: true,
          registrationCode: null,
          status: null,
          refundRequired: false,
        };

      const [paymentContext] = await transaction
        .select({
          payment: payments,
          registration: registrations,
          event: events,
        })
        .from(payments)
        .innerJoin(registrations, eq(payments.registrationId, registrations.id))
        .innerJoin(events, eq(registrations.eventId, events.id))
        .where(
          or(
            ilike(payments.referenceId, params.referenceId),
            eq(payments.externalId, params.externalId),
            ilike(registrations.code, params.referenceId),
          ),
        )
        .for("update")
        .limit(1);
      if (!paymentContext) {
        await transaction
          .update(paymentWebhookEvents)
          .set({ processedAt: params.at })
          .where(eq(paymentWebhookEvents.id, webhook.id));
        return {
          duplicate: false,
          registrationCode: null,
          status: null,
          refundRequired: false,
        };
      }
      const { payment, registration, event } = paymentContext;
      await transaction
        .update(paymentWebhookEvents)
        .set({ paymentId: payment.id, processedAt: params.at })
        .where(eq(paymentWebhookEvents.id, webhook.id));
      if (
        params.amountCents !== null &&
        params.amountCents < payment.amountCents
      ) {
        await transaction
          .update(payments)
          .set({
            status: "pago",
            paidAt: params.at,
            payload: params.payload,
            updatedAt: params.at,
          })
          .where(eq(payments.id, payment.id));
        await transaction
          .update(registrations)
          .set({
            status: "cancelada",
            cancellationReason:
              "Valor de pagamento divergente; revisão financeira necessária",
            reservationExpiresAt: null,
            waitlistExpiresAt: null,
            confirmedAt: null,
            updatedAt: params.at,
          })
          .where(eq(registrations.id, registration.id));
        return {
          duplicate: false,
          registrationCode: registration.code,
          status: "cancelada",
          refundRequired: true,
        };
      }

      const normalizedStatus = normalizePaymentStatus(params.status);
      if (!normalizedStatus)
        return {
          duplicate: false,
          registrationCode: registration.code,
          status: registration.status,
          refundRequired: false,
        };
      await transaction
        .update(payments)
        .set({
          status: normalizedStatus,
          paidAt: normalizedStatus === "pago" ? params.at : payment.paidAt,
          payload: params.payload,
          updatedAt: params.at,
        })
        .where(eq(payments.id, payment.id));
      if (normalizedStatus !== "pago") {
        if (
          ["cancelado", "expirado", "estornado"].includes(normalizedStatus) &&
          registration.status !== "confirmada"
        ) {
          await transaction
            .update(registrations)
            .set({
              status: "cancelada",
              cancellationReason: `Pagamento ${normalizedStatus}`,
              reservationExpiresAt: null,
              waitlistExpiresAt: null,
              confirmedAt: null,
              updatedAt: params.at,
            })
            .where(eq(registrations.id, registration.id));
          return {
            duplicate: false,
            registrationCode: registration.code,
            status: "cancelada",
            refundRequired: normalizedStatus === "estornado",
          };
        }
        return {
          duplicate: false,
          registrationCode: registration.code,
          status: registration.status,
          refundRequired: false,
        };
      }

      if (registration.status === "confirmada")
        return {
          duplicate: false,
          registrationCode: registration.code,
          status: "confirmada",
          refundRequired: false,
        };
      const hasActiveReservation =
        (registration.status === "aguardando_pagamento" ||
          registration.status === "pendente") &&
        registration.reservationExpiresAt !== null &&
        registration.reservationExpiresAt > params.at;
      const available =
        hasActiveReservation ||
        (await this.hasAvailableCapacity(
          transaction,
          event.id,
          event.maxCapacity,
          params.at,
        ));
      if (
        !available ||
        event.status === "cancelado" ||
        event.status === "finalizado"
      ) {
        await transaction
          .update(registrations)
          .set({
            status: "cancelada",
            cancellationReason:
              "Pagamento tardio sem vaga disponível; estorno necessário",
            reservationExpiresAt: null,
            waitlistExpiresAt: null,
            confirmedAt: null,
            updatedAt: params.at,
          })
          .where(eq(registrations.id, registration.id));
        return {
          duplicate: false,
          registrationCode: registration.code,
          status: "cancelada",
          refundRequired: true,
        };
      }
      await transaction
        .update(registrations)
        .set({
          status: "confirmada",
          confirmedAt: params.at,
          reservationExpiresAt: null,
          waitlistExpiresAt: null,
          updatedAt: params.at,
        })
        .where(eq(registrations.id, registration.id));
      if (registration.couponId)
        await transaction
          .update(coupons)
          .set({
            usedCount: sql`${coupons.usedCount} + 1`,
            updatedAt: params.at,
          })
          .where(eq(coupons.id, registration.couponId));
      return {
        duplicate: false,
        registrationCode: registration.code,
        status: "confirmada",
        refundRequired: false,
      };
    });
  }

  async simulatePayment(
    params: MockPaymentParams,
  ): Promise<PaymentWebhookUpdateResult> {
    const [payment] = await this.database
      .select({
        id: payments.id,
        externalId: payments.externalId,
        amountCents: payments.amountCents,
      })
      .from(payments)
      .where(ilike(payments.referenceId, params.referenceId))
      .limit(1);
    if (!payment)
      return {
        duplicate: false,
        registrationCode: null,
        status: null,
        refundRequired: false,
      };
    const payload = {
      id: payment.externalId ?? `mock-${params.referenceId}`,
      reference_id: params.referenceId,
      event_id: `mock-${params.status}-${params.referenceId}`,
      status: params.status,
      amount_cents: payment.amountCents,
    };
    return this.applyPaymentWebhook({
      provider: "mock",
      eventId: String(payload.event_id),
      referenceId: params.referenceId,
      externalId: String(payload.id),
      status: params.status,
      amountCents: payment.amountCents,
      payload,
      at: params.at,
    });
  }

  async expireReservations(
    params: ExpireReservationsParams,
  ): Promise<ExpireReservationsResult> {
    return this.database.transaction(async (transaction) => {
      const expired = await transaction
        .update(registrations)
        .set({
          status: "cancelada",
          cancellationReason: "Reserva expirada",
          reservationExpiresAt: null,
          waitlistExpiresAt: null,
          confirmedAt: null,
          updatedAt: params.at,
        })
        .where(
          and(
            inArray(registrations.status, ["pendente", "aguardando_pagamento"]),
            lte(registrations.reservationExpiresAt, params.at),
            isNull(registrations.deletedAt),
          ),
        )
        .returning({ id: registrations.id, eventId: registrations.eventId });
      if (expired.length)
        await transaction
          .update(payments)
          .set({ status: "expirado", updatedAt: params.at })
          .where(
            and(
              inArray(
                payments.registrationId,
                expired.map((row) => row.id),
              ),
              eq(payments.status, "aguardando"),
            ),
          );
      return {
        expiredCount: expired.length,
        releasedEventIds: expired.map((row) => row.eventId),
      };
    });
  }

  private async findParticipantIdentity(
    transaction: DrizzleTransaction,
    params: CreatePublicRegistrationParams,
  ): Promise<ParticipantIdentity> {
    const [byEmail] = await transaction
      .select({ id: participants.id })
      .from(participants)
      .where(
        and(
          eq(participants.email, params.participant.email),
          isNull(participants.deletedAt),
        ),
      )
      .limit(1);
    const [byCpf] = await transaction
      .select({ id: participants.id })
      .from(participants)
      .where(
        and(
          eq(participants.cpf, params.participant.cpf),
          isNull(participants.deletedAt),
        ),
      )
      .limit(1);
    if (byEmail && byCpf && byEmail.id !== byCpf.id)
      return { id: null, conflict: true };
    return { id: byEmail?.id ?? byCpf?.id ?? null, conflict: false };
  }

  private async saveParticipant(
    transaction: DrizzleTransaction,
    params: CreatePublicRegistrationParams,
    existingId: string | null,
  ): Promise<ParticipantRecord> {
    const participantId = existingId ?? params.participantId;
    if (existingId) {
      await transaction
        .update(participants)
        .set({
          name: params.participant.name,
          email: params.participant.email,
          cpf: params.participant.cpf,
          phone: params.participant.phone,
          birthDate: params.participant.birthDate,
          company: params.participant.company,
          jobTitle: params.participant.jobTitle,
          termsConsent: params.participant.termsConsent,
          marketingConsent: params.participant.marketingConsent,
          updatedAt: params.at,
        })
        .where(eq(participants.id, participantId));
      return { id: participantId };
    }
    await transaction
      .insert(participants)
      .values({
        id: participantId,
        ...params.participant,
        createdAt: params.at,
        updatedAt: params.at,
      });
    return { id: participantId };
  }

  private async findCurrentLot(
    params: FindCurrentLotParams,
  ): Promise<{ id: string; priceCents: number } | null> {
    const filters = [
      eq(ticketLots.eventId, params.event.id),
      eq(ticketLots.active, true),
      lte(ticketLots.startAt, params.at),
      gte(ticketLots.endAt, params.at),
    ];
    if (params.selectedLotId)
      filters.push(eq(ticketLots.id, params.selectedLotId));
    const lots = await params.transaction
      .select()
      .from(ticketLots)
      .where(and(...filters))
      .orderBy(asc(ticketLots.sortOrder), asc(ticketLots.startAt))
      .for("update");
    for (const lot of lots) {
      const [sold] = await params.transaction
        .select({ value: count() })
        .from(registrations)
        .where(
          and(
            eq(registrations.lotId, lot.id),
            inArray(registrations.status, [
              "confirmada",
              "pendente",
              "aguardando_pagamento",
            ]),
            or(
              eq(registrations.status, "confirmada"),
              gt(registrations.reservationExpiresAt, params.at),
            ),
            isNull(registrations.deletedAt),
          ),
        );
      if (Number(sold?.value ?? 0) < lot.maxQuantity)
        return { id: lot.id, priceCents: lot.priceCents };
    }
    return null;
  }

  private async findCoupon(
    transaction: DrizzleTransaction,
    code: string | null,
    eventId: string,
    at: Date,
  ): Promise<{
    id: string;
    type: "percentual" | "valor_fixo" | "cortesia";
    discountValue: number;
    maxUses: number | null;
    usedCount: number;
  } | null> {
    if (!code) return null;
    await transaction.execute(
      sql`select id from coupons where code = ${code} for update`,
    );
    const [coupon] = await transaction
      .select()
      .from(coupons)
      .where(
        and(
          eq(coupons.code, code),
          eq(coupons.active, true),
          or(isNull(coupons.eventId), eq(coupons.eventId, eventId)),
          lte(coupons.startAt, at),
          gte(coupons.endAt, at),
        ),
      )
      .limit(1);
    if (!coupon) return null;
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
      return null;
    return {
      id: coupon.id,
      type: coupon.type,
      discountValue: coupon.discountValue,
      maxUses: coupon.maxUses,
      usedCount: coupon.usedCount,
    };
  }

  private async countActiveSeats(
    transaction: DrizzleTransaction,
    eventId: string,
    at: Date,
  ): Promise<{ confirmed: number; reserved: number }> {
    const atIso = at.toISOString();
    const [row] = await transaction
      .select({
        confirmed: sql<number>`count(*) filter (where ${registrations.status} = 'confirmada')`,
        reserved: sql<number>`count(*) filter (where ${registrations.status} in ('pendente', 'aguardando_pagamento') and ${registrations.reservationExpiresAt} > ${atIso})`,
      })
      .from(registrations)
      .where(
        and(
          eq(registrations.eventId, eventId),
          isNull(registrations.deletedAt),
        ),
      );
    return {
      confirmed: Number(row?.confirmed ?? 0),
      reserved: Number(row?.reserved ?? 0),
    };
  }

  private async hasAvailableCapacity(
    transaction: DrizzleTransaction,
    eventId: string,
    maxCapacity: number,
    at: Date,
  ): Promise<boolean> {
    const counts = await this.countActiveSeats(transaction, eventId, at);
    return counts.confirmed + counts.reserved < maxCapacity;
  }

  private fail(code: string, message: string): CreatePublicRegistrationOutput {
    return Result.fail(new RegistrationRuleError({ code, message }));
  }
}

function mapWaitlistCandidate(row: {
  registration: typeof registrations.$inferSelect;
  participant: typeof participants.$inferSelect;
  event: typeof events.$inferSelect;
}): WaitlistCandidate {
  return {
    registrationId: row.registration.id,
    eventId: row.event.id,
    registrationCode: row.registration.code,
    eventTitle: row.event.title,
    eventSlug: row.event.slug,
    eventStartAt: row.event.startAt,
    chargeType: row.event.chargeType,
    participantName: row.participant.name,
    participantEmail: row.participant.email,
    participantPhone: row.participant.phone,
    createdAt: row.registration.createdAt,
  };
}

function toEventForRegistration(
  row: typeof events.$inferSelect,
): EventForRegistration {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    startAt: row.startAt,
    endAt: row.endAt,
    status: row.status,
    modality: row.modality,
    onlineUrl: row.onlineUrl,
    chargeType: row.chargeType,
    maxCapacity: row.maxCapacity,
    allowsWaitlist: row.allowsWaitlist,
    registrationStartAt: row.registrationStartAt,
    registrationEndAt: row.registrationEndAt,
  };
}

function isRegistrationWindowOpen(
  event: EventForRegistration,
  at: Date,
): boolean {
  const eventStatusOpen =
    event.status === "agendado" || event.status === "inscricoes_abertas";
  return (
    eventStatusOpen &&
    at >= event.registrationStartAt &&
    at <= event.registrationEndAt
  );
}

function normalizePaymentStatus(
  value: string,
):
  | "aguardando"
  | "pago"
  | "recusado"
  | "cancelado"
  | "expirado"
  | "estornado"
  | null {
  const statuses: Record<
    string,
    "aguardando" | "pago" | "recusado" | "cancelado" | "expirado" | "estornado"
  > = {
    aguardando: "aguardando",
    pago: "pago",
    recusado: "recusado",
    cancelado: "cancelado",
    expirado: "expirado",
    estornado: "estornado",
  };
  return statuses[value.toLowerCase()] ?? null;
}
