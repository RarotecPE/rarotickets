import { PersistenceMapper } from '@core/application/persistence-mapper.base';
import type { ToDomainParams, ToPersistenceParams } from '@core/application/persistence-mapper.base';
import { Identifier } from '@core/domain/identifier';
import { MoneyVO } from '@core/domain/value-objects/money.vo';
import { Payment } from '../../../../domain/entities/payment.entity';
import { PaymentNotification } from '../../../../domain/entities/payment-notification.entity';
import type { PaymentEventRecord } from '../../../../domain/repositories/payment-repository.interface';
import { InstallmentPlan } from '../../../../domain/value-objects/installment-plan.vo';
import { PaymentMethod } from '../../../../domain/value-objects/payment-method.vo';
import type { PaymentMethodValue } from '../../../../domain/value-objects/payment-method.vo';
import { PaymentReference } from '../../../../domain/value-objects/payment-reference.vo';
import { PaymentStatus } from '../../../../domain/value-objects/payment-status.vo';
import type { PaymentStatusValue } from '../../../../domain/value-objects/payment-status.vo';
import { PaymentTransaction } from '../../../../domain/value-objects/payment-transaction.vo';
import type {
  PaymentEventModel,
  PaymentModel,
  PaymentWebhookLogModel,
} from '../models/payment.model';

export type PaymentData = Omit<PaymentModel, 'created_at' | 'updated_at'> & {
  created_at: Date;
  updated_at: Date;
};

export class PaymentPersistenceMapper extends PersistenceMapper<Payment, PaymentModel, PaymentData> {
  public toDomain({ record }: ToDomainParams<PaymentModel>): Payment {
    return Payment.reconstitute({
      props: {
        registrationId: record.registration_id,
        eventId: record.event_id,
        participantId: record.participant_id ?? '',
        reference: PaymentReference.reconstitute(record.reference),
        method: PaymentMethod.reconstitute(record.method as PaymentMethodValue),
        status: PaymentStatus.reconstitute(record.status as PaymentStatusValue),
        amount: MoneyVO.reconstitute({ cents: record.amount_cents }),
        installments: InstallmentPlan.reconstitute({
          installments: record.installments,
          installmentCents: record.installment_amount_cents,
          totalCents: record.amount_cents,
        }),
        transaction: PaymentTransaction.create({
          providerName: record.provider_name,
          providerChargeId: record.pagbank_charge_id,
          providerStatus: record.provider_status,
          qrCode: record.pix_copy_paste ?? record.pix_qr_code,
          qrCodeImageUrl: record.pix_qr_code,
          qrCodeExpiresAt: record.pix_expires_at ? new Date(record.pix_expires_at) : null,
          boletoLine: record.boleto_barcode,
          boletoUrl: null,
          boletoDueDate: record.boleto_due_date ? new Date(record.boleto_due_date) : null,
          cardBrand: record.card_brand,
          cardLast4: record.card_last4,
          authorizationCode: record.authorization_code,
        }),
        expiresAt: record.expires_at ? new Date(record.expires_at) : null,
        paidAt: record.paid_at ? new Date(record.paid_at) : null,
        refundedAt: record.refunded_at ? new Date(record.refunded_at) : null,
        refundReason: record.refund_reason,
        refundedAmountCents: record.refunded_cents > 0 ? record.refunded_cents : null,
        cancelReason: record.cancel_reason,
        failureReason: record.failure_reason,
        providerName: record.provider_name,
        createdBy: record.created_by,
      },
      id: Identifier.fromExisting(record.id),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    });
  }

  public toPersistence({ entity }: ToPersistenceParams<Payment>): PaymentData {
    const transaction = entity.transaction;
    return {
      id: entity.id.toString(),
      registration_id: entity.registrationId,
      event_id: entity.eventId,
      participant_id: entity.participantId || null,
      method: entity.method.value,
      status: entity.status.value,
      amount_cents: entity.amount.cents,
      installments: entity.installments.installments,
      installment_amount_cents: entity.installments.installmentCents,
      card_brand: transaction.cardBrand,
      card_last4: transaction.cardLast4,
      reference: entity.reference.value,
      pagbank_charge_id: transaction.providerChargeId,
      pagbank_order_id: null,
      provider_name: transaction.providerName ?? entity.providerName,
      provider_status: transaction.providerStatus,
      authorization_code: transaction.authorizationCode,
      pix_qr_code: transaction.qrCodeImageUrl,
      pix_copy_paste: transaction.qrCode,
      pix_expires_at: transaction.qrCodeExpiresAt,
      boleto_barcode: transaction.boletoLine,
      boleto_due_date: transaction.boletoDueDate ? transaction.boletoDueDate.toISOString().slice(0, 10) : null,
      paid_at: entity.paidAt,
      cancelled_at: entity.status.isCancelled() || entity.status.isExpired() ? entity.updatedAt : null,
      cancel_reason: entity.cancelReason,
      refunded_cents: entity.refundedAmountCents ?? 0,
      refunded_at: entity.refundedAt,
      refund_reason: entity.refundReason,
      failure_reason: entity.failureReason,
      expires_at: entity.expiresAt,
      created_by: entity.createdBy,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }

  public mapEvent(record: PaymentEventModel): PaymentEventRecord {
    return {
      paymentId: record.payment_id,
      registrationId: '',
      type: record.event_type,
      fromStatus: record.status_from,
      toStatus: record.status_to ?? '',
      providerStatus: record.provider_status,
      description: record.description ?? record.reason ?? '',
      actorUserId: record.actor_user_id,
      actorName: record.actor_name,
      occurredAt: new Date(record.created_at),
    };
  }

  public mapNotification(record: PaymentWebhookLogModel): PaymentNotification {
    return PaymentNotification.reconstitute({
      props: {
        providerName: record.provider,
        notificationId: record.notification_id,
        paymentId: record.payment_id,
        providerStatus: record.status,
        reference: record.reference,
        payload: record.payload,
        receivedAt: new Date(record.created_at),
        processedAt: record.processed_at ? new Date(record.processed_at) : null,
        errorMessage: record.error_message,
      },
      id: Identifier.fromExisting(record.id),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.processed_at ?? record.created_at),
    });
  }
}
