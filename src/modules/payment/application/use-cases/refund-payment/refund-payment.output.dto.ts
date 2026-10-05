import type { PaymentDto } from '../../mappers/payment.mapper';

export type RefundPaymentOutputDto = {
  payment: PaymentDto;
  refundedAmountCents: number;
  providerRefundId: string | null;
};
