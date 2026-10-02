import type { Result } from '../../../../@core/domain/result.ts';
import type { DomainError } from '../../../../@core/domain/domain-error.base.ts';
import type { Payment } from '../entities/payment.aggregate.ts';
import type {
  CreatePaymentIfAbsentOutput,
  CreatePaymentIfAbsentParams,
  ExternalTransactionId,
  FindOpenPaymentParams,
  IPaymentRepository,
  PaymentId,
  PaymentReference,
  PaymentReconciliationQuery,
  PaymentsByRegistrationParams,
} from './payment-repository.interface.ts';

export abstract class PaymentRepository implements IPaymentRepository {
  abstract findById(id: PaymentId): Promise<Payment | null>;
  abstract findByInternalReference(reference: PaymentReference): Promise<Payment | null>;
  abstract findByExternalTransactionId(externalTransactionId: ExternalTransactionId): Promise<Payment | null>;
  abstract findOpenByRegistration(params: FindOpenPaymentParams): Promise<Payment | null>;
  abstract listByRegistration(params: PaymentsByRegistrationParams): Promise<Payment[]>;
  abstract createPendingIfAbsent(params: CreatePaymentIfAbsentParams): Promise<Result<CreatePaymentIfAbsentOutput, DomainError>>;
  abstract save(payment: Payment): Promise<Result<void, DomainError>>;
  abstract listForReconciliation(params: PaymentReconciliationQuery): Promise<Payment[]>;
}
