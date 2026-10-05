import type { IDatabaseClient, IDatabaseConnection } from '@server/infrastructure/database/database.client';
import type { Payment } from '../../../../domain/entities/payment.entity';
import { PaymentRepository } from '../../../../domain/repositories/payment-repository.base';
import type {
  ListPaymentsResult,
  PaymentEventRecord,
  PaymentFilter,
  PaymentId,
} from '../../../../domain/repositories/payment-repository.interface';
import { PaymentPersistenceMapper } from '../mappers/payment-persistence.mapper';
import type { PaymentEventModel, PaymentModel } from '../models/payment.model';

export type PaymentRepositoryDependencies = {
  db: IDatabaseClient;
  mapper: PaymentPersistenceMapper;
};

const COLUMNS = `id, registration_id, event_id, participant_id, method, status, amount_cents, installments,
  installment_amount_cents, card_brand, card_last4, reference, pagbank_charge_id, pagbank_order_id,
  provider_name, provider_status, authorization_code, pix_qr_code, pix_copy_paste, pix_expires_at,
  boleto_barcode, boleto_due_date, paid_at, cancelled_at, cancel_reason, refunded_cents, refunded_at,
  refund_reason, failure_reason, expires_at, created_by, created_at, updated_at`;

export class PaymentRepositoryImpl extends PaymentRepository {
  private readonly db: IDatabaseClient;
  private readonly mapper: PaymentPersistenceMapper;

  constructor(dependencies: PaymentRepositoryDependencies) {
    super();
    this.db = dependencies.db;
    this.mapper = dependencies.mapper;
  }

  private async loadOne(
    connection: IDatabaseConnection,
    where: { column: 'id' | 'reference' | 'pagbank_charge_id'; value: string },
  ): Promise<Payment | null> {
    const record = await connection.queryOne<PaymentModel>({
      sql: `SELECT ${COLUMNS} FROM payments WHERE ${where.column} = $1`,
      params: [where.value],
    });
    return record ? this.mapper.toDomain({ record }) : null;
  }

  async findById(id: PaymentId): Promise<Payment | null> {
    return this.loadOne(this.db, { column: 'id', value: id });
  }

  async findByReference(reference: string): Promise<Payment | null> {
    return this.loadOne(this.db, { column: 'reference', value: reference });
  }

  async findByProviderChargeId(providerChargeId: string): Promise<Payment | null> {
    return this.loadOne(this.db, { column: 'pagbank_charge_id', value: providerChargeId });
  }

  async findByRegistrationId(registrationId: string): Promise<Payment[]> {
    const records = await this.db.query<PaymentModel>({
      sql: `SELECT ${COLUMNS} FROM payments WHERE registration_id = $1 ORDER BY created_at DESC`,
      params: [registrationId],
    });
    return records.map((record) => this.mapper.toDomain({ record }));
  }

  async list(params: PaymentFilter): Promise<ListPaymentsResult> {
    const search = params.search ? `%${params.search.toLowerCase()}%` : null;
    const filters = `($1::uuid IS NULL OR registration_id = $1)
      AND ($2::uuid IS NULL OR event_id = $2)
      AND ($3::uuid IS NULL OR participant_id = $3)
      AND ($4::text IS NULL OR status = $4)
      AND ($5::text IS NULL OR method = $5)
      AND ($6::text IS NULL OR lower(reference) LIKE $6)
      AND ($7::timestamptz IS NULL OR created_at >= $7)
      AND ($8::timestamptz IS NULL OR created_at <= $8)`;

    const shared: unknown[] = [
      params.registrationId ?? null,
      params.eventId ?? null,
      params.participantId ?? null,
      params.status ?? null,
      params.method ?? null,
      search,
      params.from ?? null,
      params.to ?? null,
    ];

    const records = await this.db.query<PaymentModel>({
      sql: `SELECT ${COLUMNS} FROM payments WHERE ${filters}
            ORDER BY created_at DESC LIMIT $9 OFFSET $10`,
      params: [...shared, params.perPage, (params.page - 1) * params.perPage],
    });

    const totalRow = await this.db.queryOne<{ total: string }>({
      sql: `SELECT COUNT(*)::text AS total FROM payments WHERE ${filters}`,
      params: shared,
    });

    return {
      payments: records.map((record) => this.mapper.toDomain({ record })),
      total: Number(totalRow?.total ?? 0),
    };
  }

  async listPendingForReconciliation(params: { createdAfter: Date; limit: number }): Promise<Payment[]> {
    const records = await this.db.query<PaymentModel>({
      sql: `SELECT ${COLUMNS} FROM payments
            WHERE status IN ('PENDENTE', 'AGUARDANDO') AND created_at >= $1
            ORDER BY created_at ASC LIMIT $2`,
      params: [params.createdAfter, params.limit],
    });
    return records.map((record) => this.mapper.toDomain({ record }));
  }

  async listExpired(params: { at: Date; limit: number }): Promise<Payment[]> {
    const records = await this.db.query<PaymentModel>({
      sql: `SELECT ${COLUMNS} FROM payments
            WHERE status IN ('PENDENTE', 'AGUARDANDO') AND expires_at IS NOT NULL AND expires_at <= $1
            ORDER BY expires_at ASC LIMIT $2`,
      params: [params.at, params.limit],
    });
    return records.map((record) => this.mapper.toDomain({ record }));
  }

  async save(payment: Payment): Promise<void> {
    await this.insert(this.db, payment);
  }

  async update(payment: Payment): Promise<void> {
    const data = this.mapper.toPersistence({ entity: payment });
    await this.db.execute({
      sql: `UPDATE payments SET method = $2, status = $3, amount_cents = $4, installments = $5,
              installment_amount_cents = $6, card_brand = $7, card_last4 = $8, pagbank_charge_id = $9,
              provider_name = $10, provider_status = $11, authorization_code = $12, pix_qr_code = $13,
              pix_copy_paste = $14, pix_expires_at = $15, boleto_barcode = $16, boleto_due_date = $17,
              paid_at = $18, cancelled_at = $19, cancel_reason = $20, refunded_cents = $21,
              refunded_at = $22, refund_reason = $23, failure_reason = $24, expires_at = $25,
              participant_id = $26, updated_at = $27
            WHERE id = $1`,
      params: [
        data.id, data.method, data.status, data.amount_cents, data.installments,
        data.installment_amount_cents, data.card_brand, data.card_last4, data.pagbank_charge_id,
        data.provider_name, data.provider_status, data.authorization_code, data.pix_qr_code,
        data.pix_copy_paste, data.pix_expires_at, data.boleto_barcode, data.boleto_due_date,
        data.paid_at, data.cancelled_at, data.cancel_reason, data.refunded_cents,
        data.refunded_at, data.refund_reason, data.failure_reason, data.expires_at,
        data.participant_id, data.updated_at,
      ],
    });
  }

  private async insert(connection: IDatabaseConnection, payment: Payment): Promise<void> {
    const data = this.mapper.toPersistence({ entity: payment });
    await connection.execute({
      sql: `INSERT INTO payments (id, registration_id, event_id, participant_id, method, status,
              amount_cents, installments, installment_amount_cents, card_brand, card_last4, reference,
              pagbank_charge_id, provider_name, provider_status, authorization_code, pix_qr_code,
              pix_copy_paste, pix_expires_at, boleto_barcode, boleto_due_date, paid_at, cancelled_at,
              cancel_reason, refunded_cents, refunded_at, refund_reason, failure_reason, expires_at,
              created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
              $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)`,
      params: [
        data.id, data.registration_id, data.event_id, data.participant_id, data.method, data.status,
        data.amount_cents, data.installments, data.installment_amount_cents, data.card_brand, data.card_last4,
        data.reference, data.pagbank_charge_id, data.provider_name, data.provider_status, data.authorization_code,
        data.pix_qr_code, data.pix_copy_paste, data.pix_expires_at, data.boleto_barcode, data.boleto_due_date,
        data.paid_at, data.cancelled_at, data.cancel_reason, data.refunded_cents, data.refunded_at,
        data.refund_reason, data.failure_reason, data.expires_at, data.created_by, data.created_at, data.updated_at,
      ],
    });
  }

  async saveEvent(record: PaymentEventRecord): Promise<void> {
    await this.db.execute({
      sql: `INSERT INTO payment_events (id, payment_id, event_type, status_from, status_to,
              provider_status, description, reason, actor_user_id, actor_name, amount_cents, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      params: [
        generateUuid(), record.paymentId, record.type, record.fromStatus, record.toStatus,
        record.providerStatus, record.description, record.description,
        record.actorUserId, record.actorName, null, record.occurredAt,
      ],
    });
  }

  async listEvents(paymentId: string): Promise<PaymentEventRecord[]> {
    const records = await this.db.query<PaymentEventModel>({
      sql: `SELECT * FROM payment_events WHERE payment_id = $1 ORDER BY created_at DESC`,
      params: [paymentId],
    });
    return records.map((record) => this.mapper.mapEvent(record));
  }
}

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
