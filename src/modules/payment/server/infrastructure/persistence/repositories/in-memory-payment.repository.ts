import { ConflictError, NotFoundError } from '../../../../../../@core/domain/errors/domain-errors.ts';
import { Result } from '../../../../../../@core/domain/result.ts';
import { Payment } from '../../../../domain/entities/payment.aggregate.ts';
import { PaymentRepository } from '../../../../domain/repositories/payment-repository.base.ts';
import type {
  CreatePaymentIfAbsentOutput,
  CreatePaymentIfAbsentParams,
  ExternalTransactionId,
  FindOpenPaymentParams,
  PaymentId,
  PaymentReference,
  PaymentReconciliationQuery,
  PaymentsByRegistrationParams,
} from '../../../../domain/repositories/payment-repository.interface.ts';
import type { DomainError } from '../../../../../../@core/domain/domain-error.base.ts';

export type InMemoryPaymentRepositoryDependencies = { initialPayments?: Payment[] };

/** Single-process adapter; production must enforce the same constraints transactionally. */
export class InMemoryPaymentRepository extends PaymentRepository {
  private readonly payments: Map<PaymentId, Payment>;

  constructor(dependencies: InMemoryPaymentRepositoryDependencies = {}) {
    super();
    this.payments = new Map((dependencies.initialPayments ?? []).map((payment) => [payment.id.toString(), payment]));
  }

  public async findById(id: PaymentId): Promise<Payment | null> {
    return this.payments.get(id) ?? null;
  }

  public async findByInternalReference(reference: PaymentReference): Promise<Payment | null> {
    return [...this.payments.values()].find((payment) => payment.internalReference === reference) ?? null;
  }

  public async findByExternalTransactionId(externalTransactionId: ExternalTransactionId): Promise<Payment | null> {
    return [...this.payments.values()].find((payment) => payment.externalTransactionId === externalTransactionId) ?? null;
  }

  public async findOpenByRegistration(params: FindOpenPaymentParams): Promise<Payment | null> {
    const candidate = [...this.payments.values()].find((payment) => payment.registrationId === params.registrationId
      && payment.hasOpenCharge);
    if (!candidate) return null;
    candidate.expireIfDue({ now: params.now });
    return candidate.hasOpenCharge ? candidate : null;
  }

  public async listByRegistration(params: PaymentsByRegistrationParams): Promise<Payment[]> {
    return [...this.payments.values()]
      .filter((payment) => payment.registrationId === params.registrationId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  public async createPendingIfAbsent(
    params: CreatePaymentIfAbsentParams,
  ): Promise<Result<CreatePaymentIfAbsentOutput, DomainError>> {
    const existing = [...this.payments.values()].find((payment) => payment.registrationId === params.payment.registrationId
      && payment.hasOpenCharge);
    existing?.expireIfDue({ now: params.now });
    if (existing?.hasOpenCharge) return Result.ok({ payment: existing, wasCreated: false });
    const duplicateReference = [...this.payments.values()].some((payment) => payment.internalReference === params.payment.internalReference);
    if (this.payments.has(params.payment.id.toString()) || duplicateReference) {
      return Result.fail(new ConflictError({ code: 'PAYMENT_ID_CONFLICT', message: 'O identificador interno ou referência do pagamento já está em uso.' }));
    }
    this.payments.set(params.payment.id.toString(), params.payment);
    return Result.ok({ payment: params.payment, wasCreated: true });
  }

  public async save(payment: Payment): Promise<Result<void, DomainError>> {
    const paymentId = payment.id.toString();
    if (!this.payments.has(paymentId)) {
      return Result.fail(new NotFoundError({ code: 'PAYMENT_NOT_FOUND', message: 'Pagamento não encontrado.' }));
    }
    const externalId = payment.externalTransactionId;
    const duplicateExternalId = externalId && [...this.payments.values()].some((candidate) => candidate.id.toString() !== paymentId
      && candidate.externalTransactionId === externalId);
    const duplicateReference = [...this.payments.values()].some((candidate) => candidate.id.toString() !== paymentId
      && candidate.internalReference === payment.internalReference);
    if (duplicateExternalId || duplicateReference) {
      return Result.fail(new ConflictError({ code: 'PAYMENT_IDENTITY_CONFLICT', message: 'A referência ou transação externa já está vinculada a outro pagamento.' }));
    }
    this.payments.set(paymentId, payment);
    return Result.ok();
  }

  public async listForReconciliation(params: PaymentReconciliationQuery): Promise<Payment[]> {
    return [...this.payments.values()]
      .filter((payment) => params.statuses.includes(payment.status) && payment.createdAt.getTime() <= params.createdBefore.getTime())
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .slice(0, Math.max(0, params.limit));
  }
}
