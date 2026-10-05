import { Result } from '@core/domain/result';
import type { IDatabaseClient, IDatabaseConnection } from '@server/infrastructure/database/database.client';
import type { CheckIn } from '../../../../domain/entities/check-in.entity';
import type { Registration } from '../../../../domain/entities/registration.entity';
import { RegistrationRepository } from '../../../../domain/repositories/registration-repository.base';
import type {
  CheckInRecord,
  ListRegistrationsResult,
  RegistrationFilter,
  RegistrationId,
  SeatLockContext,
  SeatUsageInLock,
  WithSeatLockParams,
} from '../../../../domain/repositories/registration-repository.interface';
import type { RegistrationStatusValue } from '../../../../domain/value-objects/registration-status.vo';
import { RegistrationPersistenceMapper } from '../mappers/registration-persistence.mapper';
import type {
  CheckInModel,
  RegistrationAnswerModel,
  RegistrationModel,
  SeatUsageModel,
} from '../models/registration.model';

export type RegistrationRepositoryDependencies = {
  db: IDatabaseClient;
  mapper: RegistrationPersistenceMapper;
};

/** Erro interno que reverte a transação do bloqueio de vaga. */
class SeatLockRollback extends Error {
  public readonly originalError: Error;

  constructor(originalError: Error) {
    super('rollback');
    this.originalError = originalError;
  }
}

const COLUMNS = `id, code, event_id, participant_id, lote_id, status, seat_status, price_cents,
  discount_cents, final_amount_cents, lote_name, coupon_id, coupon_code, is_courtesy, courtesy_reason,
  payment_method, waitlist_position, reservation_expires_at, form_version, notes, confirmed_at,
  cancelled_at, cancelled_by, cancel_reason, created_by, created_at, updated_at`;

const ANSWERS_SQL = `SELECT id, registration_id, field_id, field_key, field_label, field_type, value, created_at
  FROM registration_answers WHERE registration_id = $1 ORDER BY created_at ASC`;

const CHECK_IN_SQL = 'SELECT * FROM check_ins WHERE registration_id = $1';

export class RegistrationRepositoryImpl extends RegistrationRepository {
  private readonly db: IDatabaseClient;
  private readonly mapper: RegistrationPersistenceMapper;

  constructor(dependencies: RegistrationRepositoryDependencies) {
    super();
    this.db = dependencies.db;
    this.mapper = dependencies.mapper;
  }

  private async loadRecord(
    connection: IDatabaseConnection,
    where: { column: 'id' | 'code'; value: string },
  ): Promise<Registration | null> {
    const record = await connection.queryOne<RegistrationModel>({
      sql: `SELECT ${COLUMNS} FROM registrations WHERE ${where.column} = $1`,
      params: [where.value],
    });
    if (!record) return null;

    const [answers, checkIn] = await Promise.all([
      connection.query<RegistrationAnswerModel>({ sql: ANSWERS_SQL, params: [record.id] }),
      connection.queryOne<CheckInModel>({ sql: CHECK_IN_SQL, params: [record.id] }),
    ]);

    return this.mapper.toDomain({ record: { ...record, answers, check_in: checkIn } });
  }

  async findById(id: RegistrationId): Promise<Registration | null> {
    return this.loadRecord(this.db, { column: 'id', value: id });
  }

  async findByCode(code: string): Promise<Registration | null> {
    return this.loadRecord(this.db, { column: 'code', value: code });
  }

  async findActiveByEventAndParticipant(params: {
    eventId: string;
    participantId: string;
  }): Promise<Registration | null> {
    const record = await this.db.queryOne<RegistrationModel>({
      sql: `SELECT ${COLUMNS} FROM registrations
            WHERE event_id = $1 AND participant_id = $2
              AND status IN ('PENDENTE', 'AGUARDANDO_PAGAMENTO', 'CONFIRMADA', 'LISTA_ESPERA')
            LIMIT 1`,
      params: [params.eventId, params.participantId],
    });
    return record ? this.loadRecord(this.db, { column: 'id', value: record.id }) : null;
  }

  async list(params: RegistrationFilter): Promise<ListRegistrationsResult> {
    const search = params.search ? `%${params.search.toLowerCase()}%` : null;
    const offset = (params.page - 1) * params.perPage;

    const filters = `($1::uuid IS NULL OR r.event_id = $1)
      AND ($2::uuid IS NULL OR r.participant_id = $2)
      AND ($3::text IS NULL OR r.status = $3)
      AND ($4::text IS NULL OR lower(r.code) LIKE $4 OR lower(p.name) LIKE $4 OR lower(p.email) LIKE $4)
      AND ($5::boolean IS TRUE OR r.status <> 'CANCELADA')`;

    const records = await this.db.query<RegistrationModel>({
      sql: `SELECT ${COLUMNS.replace(/(\w+)/g, 'r.$1')} FROM registrations r
            JOIN participants p ON p.id = r.participant_id
            WHERE ${filters}
            ORDER BY r.created_at DESC LIMIT $6 OFFSET $7`,
      params: [params.eventId ?? null, params.participantId ?? null, params.status ?? null, search,
        params.includingCancelled ?? false, params.perPage, offset],
    });

    const totalRow = await this.db.queryOne<{ total: string }>({
      sql: `SELECT COUNT(*)::text AS total FROM registrations r
            JOIN participants p ON p.id = r.participant_id WHERE ${filters}`,
      params: [params.eventId ?? null, params.participantId ?? null, params.status ?? null, search,
        params.includingCancelled ?? false],
    });

    const registrations = await Promise.all(
      records.map((record) => this.loadRecord(this.db, { column: 'id', value: record.id })),
    );

    return {
      registrations: registrations.filter((registration): registration is Registration => registration !== null),
      total: Number(totalRow?.total ?? 0),
    };
  }

  async listByParticipant(participantId: string): Promise<Registration[]> {
    const records = await this.db.query<RegistrationModel>({
      sql: `SELECT ${COLUMNS} FROM registrations WHERE participant_id = $1 ORDER BY created_at DESC`,
      params: [participantId],
    });
    const registrations = await Promise.all(
      records.map((record) => this.loadRecord(this.db, { column: 'id', value: record.id })),
    );
    return registrations.filter((registration): registration is Registration => registration !== null);
  }

  async listExpiredReservations(params: { at: Date; limit: number }): Promise<Registration[]> {
    const records = await this.db.query<RegistrationModel>({
      sql: `SELECT ${COLUMNS} FROM registrations
            WHERE seat_status = 'RESERVADA'
              AND reservation_expires_at IS NOT NULL
              AND reservation_expires_at <= $1
            ORDER BY reservation_expires_at ASC LIMIT $2`,
      params: [params.at, params.limit],
    });
    const registrations = await Promise.all(
      records.map((record) => this.loadRecord(this.db, { column: 'id', value: record.id })),
    );
    return registrations.filter((registration): registration is Registration => registration !== null);
  }

  async nextWaitlistPosition(eventId: string): Promise<number> {
    const row = await this.db.queryOne<{ max_position: number | null }>({
      sql: `SELECT MAX(waitlist_position) AS max_position FROM registrations
            WHERE event_id = $1 AND status = 'LISTA_ESPERA'`,
      params: [eventId],
    });
    return Number(row?.max_position ?? 0) + 1;
  }

  async listWaitingList(eventId: string): Promise<Registration[]> {
    const records = await this.db.query<RegistrationModel>({
      sql: `SELECT ${COLUMNS} FROM registrations
            WHERE event_id = $1 AND status = 'LISTA_ESPERA'
            ORDER BY waitlist_position ASC`,
      params: [eventId],
    });
    const registrations = await Promise.all(
      records.map((record) => this.loadRecord(this.db, { column: 'id', value: record.id })),
    );
    return registrations.filter((registration): registration is Registration => registration !== null);
  }

  /**
   * Executa o handler dentro de uma transação com bloqueio pessimista na linha
   * do evento (§3). Falhas de negócio (Result.fail) revertem tudo.
   */
  async withSeatLock<Output>(params: WithSeatLockParams<Output>): Promise<Result<Output>> {
    try {
      return await this.db.transaction(async (connection) => {
        const locked = await connection.queryOne<{ id: string }>({
          sql: 'SELECT id FROM events WHERE id = $1 FOR UPDATE',
          params: [params.eventId],
        });
        if (!locked) throw new Error('Evento não encontrado para controle de vagas');

        const context: SeatLockContext = {
          seatUsage: () => this.readSeatUsage(connection, params.eventId),
          findActiveRegistration: async ({ participantId }) => {
            const record = await connection.queryOne<RegistrationModel>({
              sql: `SELECT ${COLUMNS} FROM registrations
                    WHERE event_id = $1 AND participant_id = $2
                      AND status IN ('PENDENTE', 'AGUARDANDO_PAGAMENTO', 'CONFIRMADA', 'LISTA_ESPERA')
                    LIMIT 1`,
              params: [params.eventId, participantId],
            });
            if (!record) return null;
            const [answers, checkIn] = await Promise.all([
              connection.query<RegistrationAnswerModel>({ sql: ANSWERS_SQL, params: [record.id] }),
              connection.queryOne<CheckInModel>({ sql: CHECK_IN_SQL, params: [record.id] }),
            ]);
            return this.mapper.toDomain({ record: { ...record, answers, check_in: checkIn } });
          },
          nextWaitlistPosition: async () => {
            const row = await connection.queryOne<{ max_position: number | null }>({
              sql: `SELECT MAX(waitlist_position) AS max_position FROM registrations
                    WHERE event_id = $1 AND status = 'LISTA_ESPERA'`,
              params: [params.eventId],
            });
            return Number(row?.max_position ?? 0) + 1;
          },
          save: async (registration) => {
            // Dentro do bloqueio de vaga a inscrição pode ser nova (reserva) ou
            // já existente (confirmação/promoção): decide insert ou update.
            const exists = await connection.queryOne<{ id: string }>({
              sql: 'SELECT id FROM registrations WHERE id = $1',
              params: [registration.id.toString()],
            });
            await this.persist(connection, registration, !exists);
          },
        };

        const result = await params.handler(context);
        if (result.isFailure) throw new SeatLockRollback(result.error);
        return result;
      });
    } catch (error) {
      if (error instanceof SeatLockRollback) return Result.fail(error.originalError);
      throw error;
    }
  }

  async save(registration: Registration): Promise<void> {
    await this.persist(this.db, registration, true);
  }

  async update(registration: Registration): Promise<void> {
    await this.persist(this.db, registration, false);
  }

  private async persist(
    connection: IDatabaseConnection,
    registration: Registration,
    isNew: boolean,
  ): Promise<void> {
    const data = this.mapper.toPersistence({ entity: registration });

    if (isNew) {
      await connection.execute({
        sql: `INSERT INTO registrations (id, code, event_id, participant_id, lote_id, status, seat_status,
                price_cents, discount_cents, final_amount_cents, lote_name, coupon_id, coupon_code,
                is_courtesy, courtesy_reason, payment_method, waitlist_position, reservation_expires_at,
                form_version, notes, confirmed_at, cancelled_at, cancelled_by, cancel_reason, created_by,
                created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
                $19, $20, $21, $22, $23, $24, $25, $26, $27)`,
        params: [
          data.id, data.code, data.event_id, data.participant_id, data.lote_id, data.status, data.seat_status,
          data.price_cents, data.discount_cents, data.final_amount_cents, data.lote_name, data.coupon_id,
          data.coupon_code, data.is_courtesy, data.courtesy_reason, data.payment_method, data.waitlist_position,
          data.reservation_expires_at, data.form_version, data.notes, data.confirmed_at, data.cancelled_at,
          data.cancelled_by, data.cancel_reason, data.created_by, data.created_at, data.updated_at,
        ],
      });

      for (const answer of registration.answers) {
        await connection.execute({
          sql: `INSERT INTO registration_answers (id, registration_id, field_id, field_key, field_label,
                  field_type, value, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, now())
                ON CONFLICT (registration_id, field_key) DO NOTHING`,
          params: [
            generateAnswerId(), data.id, answer.fieldId, answer.fieldKey, answer.fieldLabel,
            answer.fieldType, answer.value,
          ],
        });
      }
      return;
    }

    await connection.execute({
      sql: `UPDATE registrations SET status = $2, seat_status = $3, price_cents = $4, discount_cents = $5,
              final_amount_cents = $6, lote_id = $7, lote_name = $8, coupon_id = $9, coupon_code = $10,
              is_courtesy = $11, courtesy_reason = $12, payment_method = $13, waitlist_position = $14,
              reservation_expires_at = $15, form_version = $16, notes = $17, confirmed_at = $18,
              cancelled_at = $19, cancelled_by = $20, cancel_reason = $21, updated_at = $22
            WHERE id = $1`,
      params: [
        data.id, data.status, data.seat_status, data.price_cents, data.discount_cents, data.final_amount_cents,
        data.lote_id, data.lote_name, data.coupon_id, data.coupon_code, data.is_courtesy, data.courtesy_reason,
        data.payment_method, data.waitlist_position, data.reservation_expires_at, data.form_version, data.notes,
        data.confirmed_at, data.cancelled_at, data.cancelled_by, data.cancel_reason, data.updated_at,
      ],
    });
  }

  private async readSeatUsage(connection: IDatabaseConnection, eventId: string): Promise<SeatUsageInLock> {
    const row = await connection.queryOne<SeatUsageModel>({
      sql: 'SELECT capacity, occupied_seats, reserved_seats, waitlist_count, available_seats FROM event_seat_usage WHERE event_id = $1',
      params: [eventId],
    });
    return {
      capacity: Number(row?.capacity ?? 0),
      occupiedSeats: Number(row?.occupied_seats ?? 0),
      reservedSeats: Number(row?.reserved_seats ?? 0),
      waitlistCount: Number(row?.waitlist_count ?? 0),
      availableSeats: Number(row?.available_seats ?? 0),
    };
  }

  async saveCheckIn(checkIn: CheckIn): Promise<void> {
    await this.db.execute({
      sql: `INSERT INTO check_ins (id, registration_id, event_id, checked_in_at, checked_in_by,
              operator_name, method, is_override, override_reason, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
            ON CONFLICT (registration_id) DO UPDATE
              SET checked_in_at = EXCLUDED.checked_in_at, checked_in_by = EXCLUDED.checked_in_by,
                  operator_name = EXCLUDED.operator_name, method = EXCLUDED.method,
                  is_override = EXCLUDED.is_override, override_reason = EXCLUDED.override_reason`,
      params: [
        checkIn.id.toString(), checkIn.registrationId, checkIn.eventId, checkIn.checkedInAt,
        checkIn.checkedInBy, checkIn.operatorName, checkIn.method, checkIn.isOverride, checkIn.overrideReason,
      ],
    });
  }

  async findCheckIn(registrationId: string): Promise<CheckInRecord | null> {
    const record = await this.db.queryOne<CheckInModel>({
      sql: CHECK_IN_SQL,
      params: [registrationId],
    });
    return record ? toCheckInRecord(record) : null;
  }

  async listCheckInsByEvent(eventId: string): Promise<CheckInRecord[]> {
    const records = await this.db.query<CheckInModel>({
      sql: 'SELECT * FROM check_ins WHERE event_id = $1 ORDER BY checked_in_at DESC',
      params: [eventId],
    });
    return records.map(toCheckInRecord);
  }
}

function toCheckInRecord(record: CheckInModel): CheckInRecord {
  return {
    registrationId: record.registration_id,
    eventId: record.event_id,
    checkedInAt: new Date(record.checked_in_at),
    checkedInBy: record.checked_in_by,
    operatorName: record.operator_name,
    method: record.method as 'QR_CODE' | 'MANUAL',
    isOverride: record.is_override,
    overrideReason: record.override_reason,
  };
}

function generateAnswerId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export type { RegistrationStatusValue };
