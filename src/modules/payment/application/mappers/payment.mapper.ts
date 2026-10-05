import { Mapper } from '@core/application/mapper.base';
import { MoneyVO } from '@core/domain/value-objects/money.vo';
import type { Payment } from '../../domain/entities/payment.entity';
import { PAYMENT_METHOD_LABELS } from '../../domain/value-objects/payment-method.vo';
import { PAYMENT_STATUS_LABELS } from '../../domain/value-objects/payment-status.vo';

export type PaymentDto = {
  id: string;
  registrationId: string;
  eventId: string;
  participantId: string;
  reference: string;
  method: string;
  methodLabel: string;
  status: string;
  statusLabel: string;
  amountCents: number;
  amountFormatted: string;
  installments: number;
  installmentCents: number;
  installmentFormatted: string;
  expiresAt: Date | null;
  paidAt: Date | null;
  refundedAt: Date | null;
  refundedAmountCents: number | null;
  refundReason: string | null;
  cancelReason: string | null;
  failureReason: string | null;
  providerName: string | null;
  paymentData: {
    qrCode: string | null;
    qrCodeImageUrl: string | null;
    qrCodeExpiresAt: Date | null;
    boletoLine: string | null;
    boletoUrl: string | null;
    boletoDueDate: Date | null;
    cardBrand: string | null;
    cardLast4: string | null;
    authorizationCode: string | null;
    providerStatus: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
};

export type MapPaymentParams = { payment: Payment };

export class PaymentMapper extends Mapper<MapPaymentParams, PaymentDto> {
  public map({ payment }: MapPaymentParams): PaymentDto {
    const transaction = payment.transaction;
    return {
      id: payment.id.toString(),
      registrationId: payment.registrationId,
      eventId: payment.eventId,
      participantId: payment.participantId,
      reference: payment.reference.value,
      method: payment.method.value,
      methodLabel: PAYMENT_METHOD_LABELS[payment.method.value],
      status: payment.status.value,
      statusLabel: PAYMENT_STATUS_LABELS[payment.status.value],
      amountCents: payment.amount.cents,
      amountFormatted: payment.amount.format(),
      installments: payment.installments.installments,
      installmentCents: payment.installments.installmentCents,
      installmentFormatted: MoneyVO.reconstitute({ cents: payment.installments.installmentCents }).format(),
      expiresAt: payment.expiresAt,
      paidAt: payment.paidAt,
      refundedAt: payment.refundedAt,
      refundedAmountCents: payment.refundedAmountCents,
      refundReason: payment.refundReason,
      cancelReason: payment.cancelReason,
      failureReason: payment.failureReason,
      providerName: payment.providerName,
      paymentData: {
        qrCode: transaction.qrCode,
        qrCodeImageUrl: transaction.qrCodeImageUrl,
        qrCodeExpiresAt: transaction.qrCodeExpiresAt,
        boletoLine: transaction.boletoLine,
        boletoUrl: transaction.boletoUrl,
        boletoDueDate: transaction.boletoDueDate,
        cardBrand: transaction.cardBrand,
        cardLast4: transaction.cardLast4,
        authorizationCode: transaction.authorizationCode,
        providerStatus: transaction.providerStatus,
      },
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  public mapEvent(record: {
    type: string;
    fromStatus: string | null;
    toStatus: string;
    providerStatus: string | null;
    description: string;
    actorName: string | null;
    occurredAt: Date;
  }) {
    return {
      type: record.type,
      fromStatus: record.fromStatus,
      toStatus: record.toStatus,
      providerStatus: record.providerStatus,
      description: record.description,
      actorName: record.actorName,
      occurredAt: record.occurredAt,
    };
  }
}
