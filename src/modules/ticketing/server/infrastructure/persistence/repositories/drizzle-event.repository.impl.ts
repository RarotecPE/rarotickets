import "server-only";
import { and, asc, count, eq, gte, ilike, inArray, isNull, sql } from "drizzle-orm";
import { Identifier } from "@/@core/domain/identifier";
import { Event } from "@/modules/ticketing/domain/events/entities/event.aggregate";
import { EventRepository } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import type {
  CreateEventRecordParams,
  EventReadModel,
  EventRepository as EventRepositoryContract,
  FindEventByIdParams,
  GetManagedEventParams,
  GetPublicEventParams,
  ListManagedEventsParams,
  ListPublicEventsParams,
  TransitionEventParams,
  UpdateEventDetailsParams,
} from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import { events, eventActivities, eventFormFields, registrations, ticketLots } from "@/server/infrastructure/persistence/schema";
import type { EventRow } from "@/server/infrastructure/persistence/schema";
import type { Database } from "@/server/infrastructure/persistence/database";

export type DrizzleEventRepositoryDependencies = { database: Database };
type ReadModelBuildParams = { row: EventRow; at?: Date };

export class DrizzleEventRepository extends EventRepository implements EventRepositoryContract {
  private readonly database: Database;
  constructor(dependencies: DrizzleEventRepositoryDependencies) {
    super();
    this.database = dependencies.database;
  }

  async listPublic(params: ListPublicEventsParams): Promise<EventReadModel[]> {
    const filters = [isNull(events.deletedAt), inArray(events.status, ["agendado", "inscricoes_abertas"]), gte(events.endAt, new Date())];
    if (params.query?.trim()) filters.push(ilike(events.title, `%${params.query.trim()}%`));
    if (params.modality === "presencial" || params.modality === "online") filters.push(eq(events.modality, params.modality));
    const rows = await this.database.select().from(events).where(and(...filters)).orderBy(asc(events.startAt)).limit(Math.min(Math.max(params.limit, 1), 50));
    return Promise.all(rows.map((row) => this.buildReadModel({ row })));
  }

  async getPublicBySlug(params: GetPublicEventParams): Promise<EventReadModel | null> {
    const [row] = await this.database.select().from(events).where(and(
      eq(events.slug, params.slug),
      isNull(events.deletedAt),
      inArray(events.status, ["agendado", "inscricoes_abertas"]),
      gte(events.endAt, params.at),
    )).limit(1);
    return row ? this.buildReadModel({ row, at: params.at }) : null;
  }

  async listManaged(params: ListManagedEventsParams): Promise<EventReadModel[]> {
    const filters = [isNull(events.deletedAt)];
    if (!params.canViewAll) filters.push(eq(events.createdByGlobalUserId, params.userId));
    if (params.query?.trim()) filters.push(ilike(events.title, `%${params.query.trim()}%`));
    const rows = await this.database.select().from(events).where(and(...filters)).orderBy(asc(events.startAt)).limit(100);
    return Promise.all(rows.map((row) => this.buildReadModel({ row })));
  }

  async findById(params: FindEventByIdParams): Promise<Event | null> {
    const [row] = await this.database.select().from(events).where(and(eq(events.id, params.id), isNull(events.deletedAt))).limit(1);
    if (!row) return null;
    return Event.reconstitute({ id: Identifier.fromExisting(row.id), props: toEventProps(row), createdAt: row.createdAt, updatedAt: row.updatedAt });
  }

  async getManagedById(params: GetManagedEventParams): Promise<EventReadModel | null> {
    const filters = [eq(events.id, params.id), isNull(events.deletedAt)];
    if (!params.canViewAll) filters.push(eq(events.createdByGlobalUserId, params.userId));
    const [row] = await this.database.select().from(events).where(and(...filters)).limit(1);
    return row ? this.buildReadModel({ row }) : null;
  }

  async create(params: CreateEventRecordParams): Promise<EventReadModel> {
    const eventData = toEventInsert(params.event);
    await this.database.transaction(async (transaction) => {
      await transaction.insert(events).values(eventData);
      if (params.lots.length) await transaction.insert(ticketLots).values(params.lots.map((lot) => ({ ...lot, eventId: params.event.id.toString() })));
      if (params.fields.length) await transaction.insert(eventFormFields).values(params.fields.map((field) => ({ ...field, eventId: params.event.id.toString() })));
      if (params.activities.length) await transaction.insert(eventActivities).values(params.activities.map((activity) => ({ ...activity, eventId: params.event.id.toString() })));
    });
    const [row] = await this.database.select().from(events).where(eq(events.id, params.event.id.toString())).limit(1);
    if (!row) throw new Error("O evento criado não pôde ser carregado.");
    return this.buildReadModel({ row });
  }

  async update(params: UpdateEventDetailsParams): Promise<EventReadModel | null> {
    const filters = [eq(events.id, params.eventId), isNull(events.deletedAt)];
    if (!params.canViewAll) filters.push(eq(events.createdByGlobalUserId, params.actorId));
    const row = await this.database.transaction(async (transaction) => {
      const [updatedRow] = await transaction
        .update(events)
        .set({ ...toEventUpdate(params.props), updatedAt: params.updatedAt })
        .where(and(...filters))
        .returning();
      if (!updatedRow) return null;

      if (params.activities !== undefined) {
        await transaction.delete(eventActivities).where(eq(eventActivities.eventId, params.eventId));
        if (params.activities.length) {
          await transaction.insert(eventActivities).values(params.activities.map((activity) => ({ ...activity, eventId: params.eventId })));
        }
      }

      if (params.lots !== undefined) {
        const existingLots = await transaction
          .select()
          .from(ticketLots)
          .where(eq(ticketLots.eventId, params.eventId))
          .orderBy(asc(ticketLots.sortOrder), asc(ticketLots.startAt));
        const matchedLotIds = new Set<string>();

        for (let index = 0; index < params.lots.length; index += 1) {
          const lot = params.lots[index];
          const existingById = existingLots.find(
            (item) => item.id === lot.id && !matchedLotIds.has(item.id),
          );
          const fallbackByIndex =
            !existingById &&
            existingLots[index] &&
            !matchedLotIds.has(existingLots[index].id)
              ? existingLots[index]
              : undefined;
          const existingLot = existingById ?? fallbackByIndex;

          if (existingLot) {
            matchedLotIds.add(existingLot.id);
            await transaction
              .update(ticketLots)
              .set({
                name: lot.name,
                priceCents: lot.priceCents,
                maxQuantity: lot.maxQuantity,
                startAt: lot.startAt,
                endAt: lot.endAt,
                active: lot.active,
                sortOrder: lot.sortOrder,
              })
              .where(eq(ticketLots.id, existingLot.id));
          } else {
            await transaction
              .insert(ticketLots)
              .values({ ...lot, eventId: params.eventId });
          }
        }

        for (const existingLot of existingLots) {
          if (matchedLotIds.has(existingLot.id)) continue;
          const [referenced] = await transaction
            .select({ value: count() })
            .from(registrations)
            .where(eq(registrations.lotId, existingLot.id));
          if (Number(referenced?.value ?? 0) === 0) {
            await transaction
              .delete(ticketLots)
              .where(eq(ticketLots.id, existingLot.id));
          } else {
            await transaction
              .update(ticketLots)
              .set({ active: false })
              .where(eq(ticketLots.id, existingLot.id));
          }
        }
      }

      if (params.fields !== undefined) {
        const [regCount] = await transaction
          .select({ value: count() })
          .from(registrations)
          .where(and(eq(registrations.eventId, params.eventId), isNull(registrations.deletedAt)));
        if (Number(regCount?.value ?? 0) === 0) {
          await transaction.delete(eventFormFields).where(eq(eventFormFields.eventId, params.eventId));
          if (params.fields.length) {
            await transaction.insert(eventFormFields).values(params.fields.map((field) => ({ ...field, eventId: params.eventId })));
          }
        }
      }

      return updatedRow;
    });
    return row ? this.buildReadModel({ row }) : null;
  }

  async transition(params: TransitionEventParams): Promise<EventReadModel | null> {
    const filters = [eq(events.id, params.eventId), isNull(events.deletedAt)];
    if (!params.canViewAll) filters.push(eq(events.createdByGlobalUserId, params.actorId));
    const [row] = await this.database.update(events).set({ status: params.nextStatus, updatedAt: params.at }).where(and(...filters)).returning();
    return row ? this.buildReadModel({ row }) : null;
  }

  private async buildReadModel(params: ReadModelBuildParams): Promise<EventReadModel> {
    const eventId = params.row.id;
    const at = params.at ?? new Date();
    const atIso = at.toISOString();
    const [lotRows, fieldRows, activityRows, totals] = await Promise.all([
      this.database.select().from(ticketLots).where(eq(ticketLots.eventId, eventId)).orderBy(asc(ticketLots.sortOrder), asc(ticketLots.startAt)),
      this.database.select().from(eventFormFields).where(and(eq(eventFormFields.eventId, eventId), eq(eventFormFields.active, true))).orderBy(asc(eventFormFields.displayOrder)),
      this.database.select().from(eventActivities).where(eq(eventActivities.eventId, eventId)).orderBy(asc(eventActivities.startAt)),
      this.database.select({
        confirmed: sql<number>`count(*) filter (where ${registrations.status} = 'confirmada')`,
        reserved: sql<number>`count(*) filter (where ${registrations.status} in ('pendente', 'aguardando_pagamento') and ${registrations.reservationExpiresAt} > ${atIso})`,
        waitlisted: sql<number>`count(*) filter (where ${registrations.status} = 'lista_espera')`,
      }).from(registrations).where(and(eq(registrations.eventId, eventId), isNull(registrations.deletedAt))),
    ]);
    const lots = await Promise.all(lotRows.map(async (lot) => {
      const [sold] = await this.database.select({ value: count() }).from(registrations).where(and(
        eq(registrations.lotId, lot.id),
        inArray(registrations.status, ["confirmada", "pendente", "aguardando_pagamento"]),
        sql`(${registrations.status} = 'confirmada' or ${registrations.reservationExpiresAt} > ${atIso})`,
        isNull(registrations.deletedAt),
      ));
      return { id: lot.id, name: lot.name, priceCents: lot.priceCents, maxQuantity: lot.maxQuantity, soldCount: Number(sold?.value ?? 0), startAt: lot.startAt, endAt: lot.endAt, active: lot.active, sortOrder: lot.sortOrder };
    }));
    const total = totals[0];
    return {
      id: eventId,
      props: toEventProps(params.row),
      createdAt: params.row.createdAt,
      updatedAt: params.row.updatedAt,
      capacity: { confirmed: Number(total?.confirmed ?? 0), reserved: Number(total?.reserved ?? 0), waitlisted: Number(total?.waitlisted ?? 0) },
      lots,
      formFields: fieldRows.map((field) => ({ id: field.id, label: field.label, description: field.description, type: field.type, required: field.required, options: field.options, displayOrder: field.displayOrder })),
      activities: activityRows.map((activity) => ({ id: activity.id, title: activity.title, description: activity.description, speakerName: activity.speakerName, speakerBio: activity.speakerBio, room: activity.room, startAt: activity.startAt, endAt: activity.endAt })),
    };
  }
}

function toEventProps(row: EventRow) {
  const address = row.modality === "presencial" && row.addressStreet ? {
    street: row.addressStreet,
    number: row.addressNumber ?? "",
    complement: row.addressComplement,
    neighborhood: row.addressNeighborhood ?? "",
    municipality: row.addressMunicipality ?? "",
    state: row.addressState ?? "",
  } : null;
  return {
    title: row.title,
    description: row.description,
    summary: row.summary,
    slug: row.slug,
    bannerUrl: row.bannerUrl,
    modality: row.modality,
    chargeType: row.chargeType,
    status: row.status,
    startAt: row.startAt,
    endAt: row.endAt,
    registrationStartAt: row.registrationStartAt,
    registrationEndAt: row.registrationEndAt,
    maxCapacity: row.maxCapacity,
    allowsWaitlist: row.allowsWaitlist,
    onlineUrl: row.onlineUrl,
    address,
    responsibleName: row.responsibleName,
    responsibleEmail: row.responsibleEmail,
    createdByGlobalUserId: row.createdByGlobalUserId,
    certificateEnabled: row.certificateEnabled,
    workloadHours: row.workloadHours,
    certificateDescription: row.certificateDescription,
    deletedAt: row.deletedAt,
  };
}

function toEventInsert(event: Event) {
  const props = event.propsSnapshot;
  return {
    id: event.id.toString(), title: props.title, description: props.description, summary: props.summary, slug: props.slug,
    bannerUrl: props.bannerUrl, modality: props.modality, chargeType: props.chargeType, status: props.status,
    startAt: props.startAt, endAt: props.endAt, registrationStartAt: props.registrationStartAt, registrationEndAt: props.registrationEndAt,
    maxCapacity: props.maxCapacity, allowsWaitlist: props.allowsWaitlist, onlineUrl: props.onlineUrl,
    addressStreet: props.address?.street ?? null, addressNumber: props.address?.number ?? null, addressComplement: props.address?.complement ?? null,
    addressNeighborhood: props.address?.neighborhood ?? null, addressMunicipality: props.address?.municipality ?? null, addressState: props.address?.state ?? null,
    responsibleName: props.responsibleName, responsibleEmail: props.responsibleEmail, createdByGlobalUserId: props.createdByGlobalUserId,
    certificateEnabled: props.certificateEnabled, workloadHours: props.workloadHours, certificateDescription: props.certificateDescription,
    deletedAt: props.deletedAt, createdAt: event.createdAt, updatedAt: event.updatedAt,
  };
}

function toEventUpdate(props: EventReadModel["props"]) {
  return {
    title: props.title, description: props.description, summary: props.summary, slug: props.slug, bannerUrl: props.bannerUrl,
    modality: props.modality, chargeType: props.chargeType, status: props.status, startAt: props.startAt, endAt: props.endAt,
    registrationStartAt: props.registrationStartAt, registrationEndAt: props.registrationEndAt, maxCapacity: props.maxCapacity,
    allowsWaitlist: props.allowsWaitlist, onlineUrl: props.onlineUrl, addressStreet: props.address?.street ?? null,
    addressNumber: props.address?.number ?? null, addressComplement: props.address?.complement ?? null,
    addressNeighborhood: props.address?.neighborhood ?? null, addressMunicipality: props.address?.municipality ?? null,
    addressState: props.address?.state ?? null, responsibleName: props.responsibleName, responsibleEmail: props.responsibleEmail,
    certificateEnabled: props.certificateEnabled, workloadHours: props.workloadHours,
    certificateDescription: props.certificateDescription, deletedAt: props.deletedAt,
  };
}

