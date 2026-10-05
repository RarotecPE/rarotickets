import type { IDatabaseClient } from '@server/infrastructure/database/database.client';
import type { Event } from '../../../../domain/entities/event.entity';
import { EventRepository } from '../../../../domain/repositories/event-repository.base';
import type {
  EventFilter,
  EventId,
  EventSeatUsageSnapshot,
  ListEventsResult,
} from '../../../../domain/repositories/event-repository.interface';
import { EventPersistenceMapper } from '../mappers/event-persistence.mapper';
import type { EventModel, EventSeatUsageModel } from '../models/event.model';

export type EventRepositoryDependencies = { db: IDatabaseClient; mapper: EventPersistenceMapper };

const COLUMNS = `id, slug, title, summary, description, image_url, start_date, end_date, start_time, end_time,
  is_online, online_url, venue_name, address, city, state, capacity, registration_start, registration_end,
  responsible_name, responsible_email, workload_hours, type, status, certificate_enabled, certificate_text,
  certificate_template, certificate_requires_attendance, certificate_min_attendance_pct, waitlist_enabled,
  seat_reservation_minutes, max_installments, allow_pix, allow_boleto, allow_credit_card, min_installment_cents,
  form_version, created_by, published_at, cancelled_at, cancel_reason, created_at, updated_at`;

const LIST_FILTERS = `
  ($1::text IS NULL OR lower(title) LIKE $1 OR lower(coalesce(city, '')) LIKE $1 OR slug LIKE $1)
  AND ($2::text IS NULL OR status = $2)
  AND ($3::text IS NULL OR type = $3)
  AND ($4::text IS NULL OR city = $4)
  AND ($5::text IS NULL OR state = $5)
  AND ($6::timestamptz IS NULL OR start_date >= $6::date)
  AND ($7::timestamptz IS NULL OR start_date <= $7::date)
  AND ($8::boolean IS FALSE OR status <> 'RASCUNHO')
  AND ($9::boolean IS FALSE OR (start_date >= now()::date AND status <> 'CANCELADO'))`;

export class EventRepositoryImpl extends EventRepository {
  private readonly db: IDatabaseClient;
  private readonly mapper: EventPersistenceMapper;

  constructor(dependencies: EventRepositoryDependencies) {
    super();
    this.db = dependencies.db;
    this.mapper = dependencies.mapper;
  }

  private buildFilter(values: EventFilter): unknown[] {
    const startDateTo = values.startDateTo
      ? new Date(`${values.startDateTo.toISOString().slice(0, 10)}T23:59:59.999Z`)
      : null;
    return [
      values.search ? `%${values.search.toLowerCase()}%` : null,
      values.status,
      values.type,
      values.city,
      values.state,
      values.startDateFrom,
      startDateTo,
      values.onlyPublic ?? false,
      values.onlyUpcoming ?? false,
    ];
  }

  async findById(id: EventId): Promise<Event | null> {
    const record = await this.db.queryOne<EventModel>({
      sql: `SELECT ${COLUMNS} FROM events WHERE id = $1`,
      params: [id],
    });
    return record ? this.mapper.toDomain({ record }) : null;
  }

  async findBySlug(slug: string): Promise<Event | null> {
    const record = await this.db.queryOne<EventModel>({
      sql: `SELECT ${COLUMNS} FROM events WHERE slug = $1`,
      params: [slug],
    });
    return record ? this.mapper.toDomain({ record }) : null;
  }

  async existsBySlug(slug: string, ignoreEventId?: EventId): Promise<boolean> {
    const record = await this.db.queryOne<{ total: string }>({
      sql: `SELECT COUNT(*)::text AS total FROM events
            WHERE slug = $1 AND ($2::uuid IS NULL OR id <> $2::uuid)`,
      params: [slug, ignoreEventId ?? null],
    });
    return Number(record?.total ?? 0) > 0;
  }

  async list(params: EventFilter): Promise<ListEventsResult> {
    const filterParams = this.buildFilter(params);
    const offset = (params.page - 1) * params.perPage;

    const records = await this.db.query<EventModel>({
      sql: `SELECT ${COLUMNS} FROM events WHERE ${LIST_FILTERS}
            ORDER BY start_date ASC, start_time ASC LIMIT $10 OFFSET $11`,
      params: [...filterParams, params.perPage, offset],
    });

    const totalRow = await this.db.queryOne<{ total: string }>({
      sql: `SELECT COUNT(*)::text AS total FROM events WHERE ${LIST_FILTERS}`,
      params: filterParams,
    });

    return {
      events: records.map((record) => this.mapper.toDomain({ record })),
      total: Number(totalRow?.total ?? 0),
    };
  }

  async listForStatusSync(): Promise<Event[]> {
    const records = await this.db.query<EventModel>({
      sql: `SELECT ${COLUMNS} FROM events
            WHERE status IN ('AGENDADO', 'INSCRICOES_ABERTAS', 'INSCRICOES_ENCERRADAS', 'EM_ANDAMENTO')
            ORDER BY start_date ASC`,
      params: [],
    });
    return records.map((record) => this.mapper.toDomain({ record }));
  }

  async getSeatUsage(eventId: EventId): Promise<EventSeatUsageSnapshot | null> {
    const record = await this.db.queryOne<EventSeatUsageModel>({
      sql: 'SELECT * FROM event_seat_usage WHERE event_id = $1',
      params: [eventId],
    });
    return record ? this.mapper.mapSeatUsage({ record }) : null;
  }

  async getSeatUsageForEvents(eventIds: EventId[]): Promise<EventSeatUsageSnapshot[]> {
    if (eventIds.length === 0) return [];
    const records = await this.db.query<EventSeatUsageModel>({
      sql: 'SELECT * FROM event_seat_usage WHERE event_id = ANY($1::uuid[])',
      params: [eventIds],
    });
    return records.map((record) => this.mapper.mapSeatUsage({ record }));
  }

  async save(event: Event): Promise<void> {
    const data = this.mapper.toPersistence({ entity: event });
    await this.db.execute({
      sql: `INSERT INTO events (id, slug, title, summary, description, image_url, start_date, end_date,
              start_time, end_time, is_online, online_url, venue_name, address, city, state, capacity,
              registration_start, registration_end, responsible_name, responsible_email, workload_hours,
              type, status, certificate_enabled, certificate_text, certificate_template,
              certificate_requires_attendance, certificate_min_attendance_pct, waitlist_enabled,
              seat_reservation_minutes, max_installments, allow_pix, allow_boleto, allow_credit_card,
              min_installment_cents, form_version, created_by, published_at, cancelled_at, cancel_reason,
              created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
              $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36,
              $37, $38, $39, $40, $41, $42, $43)`,
      params: [
        data.id, data.slug, data.title, data.summary, data.description, data.image_url, data.start_date,
        data.end_date, data.start_time, data.end_time, data.is_online, data.online_url, data.venue_name,
        data.address, data.city, data.state, data.capacity, data.registration_start, data.registration_end,
        data.responsible_name, data.responsible_email, data.workload_hours, data.type, data.status,
        data.certificate_enabled, data.certificate_text, data.certificate_template,
        data.certificate_requires_attendance, data.certificate_min_attendance_pct, data.waitlist_enabled,
        data.seat_reservation_minutes, data.max_installments, data.allow_pix, data.allow_boleto,
        data.allow_credit_card, data.min_installment_cents, data.form_version, data.created_by,
        data.published_at, data.cancelled_at, data.cancel_reason, data.created_at, data.updated_at,
      ],
    });
  }

  async update(event: Event): Promise<void> {
    const data = this.mapper.toPersistence({ entity: event });
    await this.db.execute({
      sql: `UPDATE events SET slug = $2, title = $3, summary = $4, description = $5, image_url = $6,
              start_date = $7, end_date = $8, start_time = $9, end_time = $10, is_online = $11,
              online_url = $12, venue_name = $13, address = $14, city = $15, state = $16, capacity = $17,
              registration_start = $18, registration_end = $19, responsible_name = $20,
              responsible_email = $21, workload_hours = $22, type = $23, status = $24,
              certificate_enabled = $25, certificate_text = $26, certificate_template = $27,
              certificate_requires_attendance = $28, certificate_min_attendance_pct = $29,
              waitlist_enabled = $30, seat_reservation_minutes = $31, max_installments = $32,
              allow_pix = $33, allow_boleto = $34, allow_credit_card = $35, min_installment_cents = $36,
              form_version = $37, published_at = $38, cancelled_at = $39, cancel_reason = $40,
              updated_at = $41
            WHERE id = $1`,
      params: [
        data.id, data.slug, data.title, data.summary, data.description, data.image_url, data.start_date,
        data.end_date, data.start_time, data.end_time, data.is_online, data.online_url, data.venue_name,
        data.address, data.city, data.state, data.capacity, data.registration_start, data.registration_end,
        data.responsible_name, data.responsible_email, data.workload_hours, data.type, data.status,
        data.certificate_enabled, data.certificate_text, data.certificate_template,
        data.certificate_requires_attendance, data.certificate_min_attendance_pct, data.waitlist_enabled,
        data.seat_reservation_minutes, data.max_installments, data.allow_pix, data.allow_boleto,
        data.allow_credit_card, data.min_installment_cents, data.form_version, data.published_at,
        data.cancelled_at, data.cancel_reason, data.updated_at,
      ],
    });
  }
}
