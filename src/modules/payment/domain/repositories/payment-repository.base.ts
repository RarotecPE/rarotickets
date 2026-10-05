import type { Payment } from '../entities/payment.entity';
import type {
  IPaymentRepository,
  ListPaymentsResult,
  PaymentEventRecord,
  PaymentFilter,
  PaymentId,
} from './payment-repository.interface';

export abstract class PaymentRepository implements IPaymentRepository {
  abstract findById(id: PaymentId): Promise<Payment | null>;
  abstract findByReference(reference: string): Promise<Payment | null>;
  abstract findByProviderChargeId(providerChargeId: string): Promise<Payment | null>;
  abstract findByRegistrationId(registrationId: string): Promise<Payment[]>;
  abstract list(filter: PaymentFilter): Promise<ListPaymentsResult>;
  abstract listPendingForReconciliation(params: { createdAfter: Date; limit: number }): Promise<Payment[]>;
  abstract listExpired(params: { at: Date; limit: number }): Promise<Payment[]>;
  abstract save(payment: Payment): Promise<void>;
  abstract update(payment: Payment): Promise<void>;
  abstract saveEvent(record: PaymentEventRecord): Promise<void>;
  abstract listEvents(paymentId: string): Promise<PaymentEventRecord[]>;
}
