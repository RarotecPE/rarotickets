import type { Result } from '../../../../@core/domain/result.ts';
import type { DomainError } from '../../../../@core/domain/domain-error.base.ts';
import type { Payment, PaymentStatus } from '../entities/payment.aggregate.ts';

export type PaymentId = string;
export type PaymentReference = string;
export type ExternalTransactionId = string;
export type FindOpenPaymentParams = { registrationId: string; now: Date };
export type PaymentsByRegistrationParams = { registrationId: string };
export type CreatePaymentIfAbsentParams = { payment: Payment; now: Date };
export type CreatePaymentIfAbsentOutput = { payment: Payment; wasCreated: boolean };
export type PaymentReconciliationQuery = { statuses: PaymentStatus[]; createdBefore: Date; limit: number };

/** All write methods must enforce identity uniqueness atomically. */
export interface IPaymentRepository {
  findById(id: PaymentId): Promise<Payment | null>;
  findByInternalReference(reference: PaymentReference): Promise<Payment | null>;
  findByExternalTransactionId(externalTransactionId: ExternalTransactionId): Promise<Payment | null>;
  findOpenByRegistration(params: FindOpenPaymentParams): Promise<Payment | null>;
  listByRegistration(params: PaymentsByRegistrationParams): Promise<Payment[]>;
  createPendingIfAbsent(params: CreatePaymentIfAbsentParams): Promise<Result<CreatePaymentIfAbsentOutput, DomainError>>;
  save(payment: Payment): Promise<Result<void, DomainError>>;
  listForReconciliation(params: PaymentReconciliationQuery): Promise<Payment[]>;
}
