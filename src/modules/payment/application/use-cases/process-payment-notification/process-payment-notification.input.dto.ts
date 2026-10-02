import type { PaymentStatus } from '../../../domain/entities/payment.aggregate.ts';

/** Construct this DTO only after the PagBank signature/authenticity check succeeds. */
export type ProcessPaymentNotificationInputDto = {
  externalNotificationId: string;
  internalReference: string | null;
  externalTransactionId: string | null;
  status: PaymentStatus;
  financialOperationId: string | null;
  financialAmountInMinorUnits: number | null;
  financialReason: string | null;
  payloadDigest: string;
};
