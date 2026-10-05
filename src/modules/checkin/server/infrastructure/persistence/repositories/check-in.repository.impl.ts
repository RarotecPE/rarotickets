import type { IDatabaseClient } from '@server/infrastructure/database/database.client';
import { Identifier } from '@core/domain/identifier';
import { CheckInRecord } from '../../../../domain/entities/check-in-record.entity';
import { CheckInRepository } from '../../../../domain/repositories/check-in-repository.base';
import type {
  CheckInFilter,
  CheckInLookup,
  ListCheckInsResult,
} from '../../../../domain/repositories/check-in-repository.interface';
import { CheckInStats } from '../../../../domain/value-objects/check-in-stats.vo';

export type CheckInRepositoryDependencies = { db: IDatabaseClient };

type CheckInRow = {
  id: string;
  registration_id: string;
  registration_code: string | null;
  event_id: string;
  participant_id: string | null;
  participant_name: string | null;
  participant_email: string | null;
  checked_in_at: Date;
  checked_in_by: string | null;
  operator_name: string | null;
  method: string;
  is_override: boolean;
  override_reason: string | null;
};

type StatsRow = { expected: string; checked_in: string; cancelled: string; waitlisted: string };

type LookupRow = {
  registration_id: string;
  code: string;
  event_id: string;
  event_title: string;
  participant_id: string;
  participant_name: string;
  participant_email: string | null;
  status: string;
  checked_in_at: Date | null;
};

const RECORD_SELECT = `
  SELECT c.id, c.registration_id, r.code AS registration_code, c.event_id,
         r.participant_id, p.name AS participant_name, p.email AS participant_email,
         c.checked_in_at, c.checked_in_by, c.operator_name, c.method, c.is_override, c.override_reason
    FROM check_ins c
    JOIN registrations r ON r.id = c.registration_id
    LEFT JOIN participants p ON p.id = r.participant_id
   WHERE c.event_id = $1
     AND ($2::text IS NULL OR p.name ILIKE $2 OR r.code ILIKE $2)
     AND ($3::boolean IS FALSE OR c.is_override = TRUE)
   ORDER BY c.checked_in_at DESC
   LIMIT $4 OFFSET $5`;

export class CheckInRepositoryImpl extends CheckInRepository {
  private readonly db: IDatabaseClient;

  constructor(dependencies: CheckInRepositoryDependencies) {
    super();
    this.db = dependencies.db;
  }

  async listByEvent(filter: CheckInFilter): Promise<ListCheckInsResult> {
    const search = filter.search ? `%${filter.search.trim()}%` : null;
    const rows = await this.db.query<CheckInRow>({
      sql: RECORD_SELECT,
      params: [filter.eventId, search, filter.onlyOverrides ?? false, filter.perPage, (filter.page - 1) * filter.perPage],
    });

    const totalRow = await this.db.queryOne<{ total: string }>({
      sql: `SELECT COUNT(*)::text AS total
              FROM check_ins c
              JOIN registrations r ON r.id = c.registration_id
              LEFT JOIN participants p ON p.id = r.participant_id
             WHERE c.event_id = $1
               AND ($2::text IS NULL OR p.name ILIKE $2 OR r.code ILIKE $2)
               AND ($3::boolean IS FALSE OR c.is_override = TRUE)`,
      params: [filter.eventId, search, filter.onlyOverrides ?? false],
    });

    return {
      records: rows.map((row) => this.toRecord(row)),
      total: Number(totalRow?.total ?? 0),
    };
  }

  async statsByEvent(eventId: string): Promise<CheckInStats> {
    const row = await this.db.queryOne<StatsRow>({
      sql: `SELECT
              COUNT(*) FILTER (WHERE r.status = 'CONFIRMADA')::text AS expected,
              COUNT(*) FILTER (WHERE r.status = 'CONFIRMADA' AND c.id IS NOT NULL)::text AS checked_in,
              COUNT(*) FILTER (WHERE r.status = 'CANCELADA')::text AS cancelled,
              COUNT(*) FILTER (WHERE r.status = 'LISTA_ESPERA')::text AS waitlisted
            FROM registrations r
            LEFT JOIN check_ins c ON c.registration_id = r.id
           WHERE r.event_id = $1`,
      params: [eventId],
    });

    return CheckInStats.create({
      expected: Number(row?.expected ?? 0),
      checkedIn: Number(row?.checked_in ?? 0),
      cancelled: Number(row?.cancelled ?? 0),
      waitlisted: Number(row?.waitlisted ?? 0),
    });
  }

  async lookupByCode(params: { code: string; eventId?: string | null }): Promise<CheckInLookup | null> {
    const code = params.code.trim().toUpperCase();
    const row = await this.db.queryOne<LookupRow>({
      sql: `SELECT r.id AS registration_id, r.code, r.event_id, e.title AS event_title,
                   r.participant_id, p.name AS participant_name, p.email AS participant_email,
                   r.status, c.checked_in_at
              FROM registrations r
              JOIN events e ON e.id = r.event_id
              JOIN participants p ON p.id = r.participant_id
              LEFT JOIN check_ins c ON c.registration_id = r.id
             WHERE (upper(r.code) = $1 OR upper(r.id::text) = $1)
               AND ($2::uuid IS NULL OR r.event_id = $2::uuid)
             ORDER BY r.created_at DESC
             LIMIT 1`,
      params: [code, params.eventId ?? null],
    });
    if (!row) return null;

    const hasCheckedIn = row.checked_in_at !== null;
    const isConfirmed = row.status === 'CONFIRMADA';
    const canCheckIn = isConfirmed && !hasCheckedIn;
    const reason = hasCheckedIn
      ? 'Inscrição já teve check-in registrado'
      : !isConfirmed
        ? `Inscrição com status ${row.status} não permite check-in`
        : null;

    return {
      registrationId: row.registration_id,
      registrationCode: row.code,
      eventId: row.event_id,
      eventTitle: row.event_title,
      participantId: row.participant_id,
      participantName: row.participant_name,
      participantEmail: row.participant_email,
      status: row.status,
      hasCheckedIn,
      checkedInAt: row.checked_in_at ? new Date(row.checked_in_at) : null,
      canCheckIn,
      reason,
    };
  }

  private toRecord(row: CheckInRow): CheckInRecord {
    return CheckInRecord.reconstitute({
      props: {
        registrationId: row.registration_id,
        registrationCode: row.registration_code ?? '',
        eventId: row.event_id,
        participantId: row.participant_id ?? '',
        participantName: row.participant_name ?? 'Participante',
        participantEmail: row.participant_email,
        checkedInAt: new Date(row.checked_in_at),
        operatorUserId: row.checked_in_by,
        operatorName: row.operator_name,
        method: row.method === 'MANUAL' ? 'MANUAL' : 'QR_CODE',
        isOverride: row.is_override,
        overrideReason: row.override_reason,
      },
      id: Identifier.fromExisting(row.id),
      createdAt: new Date(row.checked_in_at),
      updatedAt: new Date(row.checked_in_at),
    });
  }
}
