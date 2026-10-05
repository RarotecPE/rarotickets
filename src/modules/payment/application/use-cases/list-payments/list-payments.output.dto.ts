import type { PaginationMeta } from '@core/application/pagination/pagination';
import type { PaymentDto } from '../../mappers/payment.mapper';

export type PaymentTotalsDto = {
  count: number;
  paidCents: number;
  pendingCents: number;
  refundedCents: number;
  paidFormatted: string;
  pendingFormatted: string;
  refundedFormatted: string;
};

export type ListPaymentsOutputDto = {
  payments: PaymentDto[];
  meta: PaginationMeta;
  totals: PaymentTotalsDto;
};
