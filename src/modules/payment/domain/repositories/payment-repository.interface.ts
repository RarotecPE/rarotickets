import type { Payment } from '../entities/payment.entity';
import type { PaymentStatusValue } from '../value-objects/payment-status.vo';

export type PaymentId = string;
export type PaymentFilter = {
  registrationId?: string | null;
  eventId?: string | null;
  participantId?: string | null;
  status?: PaymentStatusValue | null;
  method?: string | null;
  search?: string | null;
  from?: Date | null;
  to?: Date | null;
  page: number;
  perPage: number;
};
export type ListPaymentsResult = { payments: Payment[]; total: number };
export type PaymentEventRecord = {
  paymentId: string;
  registrationId: string;
  type: string;
  fromStatus: string | null;
  toStatus: string;
  providerStatus: string | null;
  description: string;
  actorUserId: string | null;
  actorName: string | null;
  occurredAt: Date;
};

export interface IPaymentRepository {
  findById(id: PaymentId): Promise<Payment | null>;
  findByReference(reference: string): Promise<Payment | null>;
  findByProviderChargeId(providerChargeId: string): Promise<Payment | null>;
  findByRegistrationId(registrationId: string): Promise<Payment[]>;
  list(filter: PaymentFilter): Promise<ListPaymentsResult>;
  listPendingForReconciliation(params: { createdAfter: Date; limit: number }): Promise<Payment[]>;
  listExpired(params: { at: Date; limit: number }): Promise<Payment[]>;
  save(payment: Payment): Promise<void>;
  update(payment: Payment): Promise<void>;
  saveEvent(record: PaymentEventRecord): Promise<void>;
  listEvents(paymentId: string): Promise<PaymentEventRecord[]>;
}

export const PAYMENT_REPOSITORY = Symbol('IPaymentRepository');
