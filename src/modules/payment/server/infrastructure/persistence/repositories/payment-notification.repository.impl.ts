import type { IDatabaseClient } from '@server/infrastructure/database/database.client';
import type { PaymentNotification } from '../../../../domain/entities/payment-notification.entity';
import { PaymentNotificationRepository } from '../../../../domain/repositories/payment-notification-repository.base';
import type { RegisterNotificationResult } from '../../../../domain/repositories/payment-notification-repository.interface';
import { PaymentPersistenceMapper } from '../mappers/payment-persistence.mapper';
import type { PaymentWebhookLogModel } from '../models/payment.model';

export type PaymentNotificationRepositoryDependencies = {
  db: IDatabaseClient;
  mapper: PaymentPersistenceMapper;
};

/**
 * O índice único (provider, notification_id) garante a idempotência mesmo com
 * dois webhooks simultâneos: o segundo INSERT perde e devolve DUPLICADO (§20).
 */
export class PaymentNotificationRepositoryImpl extends PaymentNotificationRepository {
  private readonly db: IDatabaseClient;
  private readonly mapper: PaymentPersistenceMapper;

  constructor(dependencies: PaymentNotificationRepositoryDependencies) {
    super();
    this.db = dependencies.db;
    this.mapper = dependencies.mapper;
  }

  async register(params: {
    providerName: string;
    notificationId: string;
    paymentId: string | null;
    providerStatus: string;
    reference: string | null;
    payload: Record<string, unknown>;
    receivedAt: Date;
  }): Promise<RegisterNotificationResult> {
    const existing = await this.findByNotificationId({
      providerName: params.providerName,
      notificationId: params.notificationId,
    });
    if (existing) return { status: 'DUPLICATED', notification: existing };

    const inserted = await this.db.queryOne<PaymentWebhookLogModel>({
      sql: `INSERT INTO payment_webhook_logs (id, provider, notification_id, payment_id, event_type,
              pagbank_charge_id, reference, payload, signature_valid, status, attempts, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, true, 'RECEBIDO', 1, $9)
            ON CONFLICT (provider, notification_id) DO NOTHING
            RETURNING *`,
      params: [
        generateUuid(),
        params.providerName,
        params.notificationId,
        params.paymentId,
        params.providerStatus,
        null,
        params.reference,
        JSON.stringify(params.payload),
        params.receivedAt,
      ],
    });

    if (!inserted) {
      const duplicated = await this.findByNotificationId({
        providerName: params.providerName,
        notificationId: params.notificationId,
      });
      if (duplicated) return { status: 'DUPLICATED', notification: duplicated };
      throw new Error('Falha ao registrar notificação de pagamento');
    }

    return { status: 'REGISTERED', notification: this.mapper.mapNotification(inserted) };
  }

  async findByNotificationId(params: {
    providerName: string;
    notificationId: string;
  }): Promise<PaymentNotification | null> {
    const record = await this.db.queryOne<PaymentWebhookLogModel>({
      sql: 'SELECT * FROM payment_webhook_logs WHERE provider = $1 AND notification_id = $2',
      params: [params.providerName, params.notificationId],
    });
    return record ? this.mapper.mapNotification(record) : null;
  }

  async listByPayment(paymentId: string): Promise<PaymentNotification[]> {
    const records = await this.db.query<PaymentWebhookLogModel>({
      sql: 'SELECT * FROM payment_webhook_logs WHERE payment_id = $1 ORDER BY created_at DESC',
      params: [paymentId],
    });
    return records.map((record) => this.mapper.mapNotification(record));
  }

  async update(notification: PaymentNotification): Promise<void> {
    await this.db.execute({
      sql: `UPDATE payment_webhook_logs SET payment_id = $2, status = $3, error_message = $4,
              processed_at = $5, attempts = attempts + 1
            WHERE provider = $1 AND notification_id = $6`,
      params: [
        notification.providerName,
        notification.paymentId,
        notification.processedAt ? (notification.errorMessage ? 'FALHA' : 'PROCESSADO') : 'RECEBIDO',
        notification.errorMessage,
        notification.processedAt,
        notification.notificationId,
      ],
    });
  }
}

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
