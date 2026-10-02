import { CapacityExceededError, ConflictError, NotFoundError, ValidationError } from '../../../../../../@core/domain/errors/domain-errors.ts';
import { Result } from '../../../../../../@core/domain/result.ts';
import { Registration } from '../../../../domain/entities/registration.aggregate.ts';
import type { Coupon } from '../../../../domain/entities/coupon.entity.ts';
import { RegistrationRepository } from '../../../../domain/repositories/registration-repository.base.ts';
import type {
  CancelRegistrationAtomicallyParams,
  ConfirmAdministrativelyAtomicallyParams,
  ConfirmPaidAtomicallyParams,
  CountRegistrationsParams,
  CountBatchOccupancyParams,
  CreateRegistrationAtomicallyOutput,
  CreateRegistrationAtomicallyParams,
  ExpireReservationsParams,
  PromoteWaitlistAtomicallyParams,
  ReturnRegistrationToPendingParams,
  StartPaymentAtomicallyParams,
} from '../../../../domain/repositories/registration-repository.interface.ts';
import type {
  RegistrationId,
  RegistrationCode,
  RegistrationEventListParams,
  RegistrationParticipantListParams,
} from '../../../../domain/repositories/registration-repository.types.ts';
import type { DomainError } from '../../../../../../@core/domain/domain-error.base.ts';

export type InMemoryRegistrationRepositoryDependencies = { initialRegistrations?: Registration[] };
export type RegistrationCapacityCheckParams = {
  eventId: string;
  eventCapacity: number | null;
  batchId: string | null;
  batchCapacity: number | null;
  now: Date;
  excludedRegistrationId?: RegistrationId;
};
export type RegistrationPageParams = { items: Registration[]; limit: number | undefined; offset: number | undefined };
export type ValidateCouponLinkParams = { registration: Registration; coupon: Coupon | null };

/**
 * Single-process adapter used for local development and tests. Production
 * adapters must implement these checks inside a database transaction/lock.
 */
export class InMemoryRegistrationRepository extends RegistrationRepository {
  private readonly registrations: Map<RegistrationId, Registration>;

  constructor(dependencies: InMemoryRegistrationRepositoryDependencies = {}) {
    super();
    this.registrations = new Map(
      (dependencies.initialRegistrations ?? []).map((registration) => [registration.id.toString(), registration]),
    );
  }

  public async findById(id: RegistrationId): Promise<Registration | null> {
    return this.registrations.get(id) ?? null;
  }

  public async findByCode(code: RegistrationCode): Promise<Registration | null> {
    const normalized = code.trim();
    return [...this.registrations.values()].find((registration) => registration.code === normalized) ?? null;
  }

  public async listByEvent(params: RegistrationEventListParams): Promise<Registration[]> {
    return this.page({
      items: [...this.registrations.values()].filter((registration) => registration.eventId === params.eventId),
      limit: params.limit,
      offset: params.offset,
    });
  }

  public async listByParticipant(params: RegistrationParticipantListParams): Promise<Registration[]> {
    return this.page({
      items: [...this.registrations.values()].filter((registration) => registration.participantId === params.participantId),
      limit: params.limit,
      offset: params.offset,
    });
  }

  public async countByEvent(params: CountRegistrationsParams): Promise<number> {
    return [...this.registrations.values()].filter((registration) => registration.eventId === params.eventId
      && this.isStatusIncluded({ status: registration.status, requested: params.statuses })).length;
  }

  public async countOccupiedSeatsByBatch(params: CountBatchOccupancyParams): Promise<number> {
    return [...this.registrations.values()].filter((registration) => registration.eventId === params.eventId
      && registration.ticketBatchId === params.batchId
      && registration.occupiesSeat({ now: params.now })).length;
  }

  public async createAtomically(
    params: CreateRegistrationAtomicallyParams,
  ): Promise<Result<CreateRegistrationAtomicallyOutput, DomainError>> {
    const duplicate = this.findDuplicate(params.registration);
    if (duplicate) return Result.fail(duplicate);

    let wasWaitlisted = params.registration.status === 'LISTA_ESPERA';
    const capacityParams: RegistrationCapacityCheckParams = {
      eventId: params.registration.eventId,
      eventCapacity: params.eventCapacity,
      batchId: params.registration.ticketBatchId,
      batchCapacity: params.batchCapacity,
      now: params.now,
    };
    if (!wasWaitlisted && !this.hasEventCapacityRoom(capacityParams)) {
      if (!params.waitlistEnabled) {
        return Result.fail(new CapacityExceededError({ code: 'EVENT_CAPACITY_REACHED', message: 'Não há vagas disponíveis para este evento.' }));
      }
      const queued = params.registration.queueForWaitlist({ now: params.now });
      if (queued.isFailure) return Result.fail(queued.error);
      wasWaitlisted = true;
    } else if (!wasWaitlisted && !this.hasBatchRoom(capacityParams)) {
      return Result.fail(new CapacityExceededError({ code: 'TICKET_BATCH_CAPACITY_REACHED', message: 'O lote selecionado não possui mais vagas disponíveis.' }));
    }

    const couponError = this.validateCouponLink({ registration: params.registration, coupon: params.coupon });
    if (couponError) return Result.fail(couponError);
    if (!wasWaitlisted && params.coupon) {
      const usage = params.coupon.recordUsage({ now: params.now });
      if (usage.isFailure) return Result.fail(usage.error);
    }
    this.registrations.set(params.registration.id.toString(), params.registration);
    return Result.ok({ registration: params.registration, wasWaitlisted });
  }

  public async startPaymentAtomically(params: StartPaymentAtomicallyParams): Promise<Result<Registration, DomainError>> {
    const registration = this.registrations.get(params.registrationId);
    if (!registration) return Result.fail(this.registrationNotFound(params.registrationId));
    if (!params.paymentId.trim()) {
      return Result.fail(new ValidationError({ code: 'PAYMENT_ID_REQUIRED', message: 'A tentativa de pagamento deve possuir identificador.' }));
    }
    const sameAttemptIsAlreadyStarted = registration.status === 'AGUARDANDO_PAGAMENTO'
      && registration.paymentAttemptIds.includes(params.paymentId);
    if (sameAttemptIsAlreadyStarted) return Result.ok(registration);
    const alreadyHasReservation = registration.occupiesSeat({ now: params.reservation.now });
    const capacityParams: RegistrationCapacityCheckParams = {
      eventId: registration.eventId,
      eventCapacity: params.eventCapacity,
      batchId: registration.ticketBatchId,
      batchCapacity: params.batchCapacity,
      now: params.reservation.now,
      excludedRegistrationId: params.registrationId,
    };
    if (!alreadyHasReservation && !this.hasEventRoom(capacityParams)) {
      return Result.fail(new CapacityExceededError({ code: 'EVENT_CAPACITY_REACHED', message: 'Não há vaga disponível para iniciar o pagamento.' }));
    }
    const started = registration.startPayment({ ...params.reservation, paymentId: params.paymentId });
    if (started.isFailure) return Result.fail(started.error);
    return Result.ok(registration);
  }

  public async confirmPaidAtomically(params: ConfirmPaidAtomicallyParams): Promise<Result<Registration, DomainError>> {
    const registration = this.registrations.get(params.registrationId);
    if (!registration) return Result.fail(this.registrationNotFound(params.registrationId));
    if (registration.status === 'CONFIRMADA') {
      const alreadyConfirmed = registration.confirmPaidPayment(params.payment);
      return alreadyConfirmed.isFailure ? Result.fail(alreadyConfirmed.error) : Result.ok(registration);
    }
    const canOccupyEvent = this.hasEventRoom({
      eventId: registration.eventId,
      eventCapacity: params.eventCapacity,
      batchId: registration.ticketBatchId,
      batchCapacity: params.batchCapacity,
      now: params.payment.now,
      excludedRegistrationId: params.registrationId,
    });
    if (!canOccupyEvent) {
      return Result.fail(new CapacityExceededError({ code: 'EVENT_CAPACITY_REACHED', message: 'O pagamento foi recebido, mas não há vaga para confirmar a inscrição; é necessária análise administrativa.' }));
    }
    const confirmed = registration.confirmPaidPayment(params.payment);
    if (confirmed.isFailure) return Result.fail(confirmed.error);
    return Result.ok(registration);
  }

  public async confirmAdministrativelyAtomically(
    params: ConfirmAdministrativelyAtomicallyParams,
  ): Promise<Result<Registration, DomainError>> {
    const registration = this.registrations.get(params.registrationId);
    if (!registration) return Result.fail(this.registrationNotFound(params.registrationId));
    if (registration.status !== 'CONFIRMADA' && !this.hasEventRoom({
      eventId: registration.eventId,
      eventCapacity: params.eventCapacity,
      batchId: registration.ticketBatchId,
      batchCapacity: params.batchCapacity,
      now: params.confirmation.now,
      excludedRegistrationId: params.registrationId,
    })) {
      return Result.fail(new CapacityExceededError({ code: 'EVENT_CAPACITY_REACHED', message: 'Não há vaga disponível para a confirmação manual.' }));
    }
    const confirmed = registration.confirmAdministratively(params.confirmation);
    if (confirmed.isFailure) return Result.fail(confirmed.error);
    return Result.ok(registration);
  }

  public async promoteWaitlistAtomically(params: PromoteWaitlistAtomicallyParams): Promise<Result<Registration, DomainError>> {
    const registration = this.registrations.get(params.registrationId);
    if (!registration) return Result.fail(this.registrationNotFound(params.registrationId));
    const hasRoom = this.hasEventRoom({
      eventId: registration.eventId,
      eventCapacity: params.eventCapacity,
      batchId: registration.ticketBatchId,
      batchCapacity: params.batchCapacity,
      now: params.now,
      excludedRegistrationId: params.registrationId,
    });
    if (!hasRoom) return Result.fail(new CapacityExceededError({ code: 'EVENT_CAPACITY_REACHED', message: 'Ainda não há vaga disponível para promover a inscrição.' }));
    const promoted = registration.promoteFromWaitlist({ now: params.now });
    if (promoted.isFailure) return Result.fail(promoted.error);
    return Result.ok(registration);
  }

  public async cancelAtomically(params: CancelRegistrationAtomicallyParams): Promise<Result<Registration, DomainError>> {
    const registration = this.registrations.get(params.registrationId);
    if (!registration) return Result.fail(this.registrationNotFound(params.registrationId));
    const cancelled = registration.cancel(params.cancellation);
    if (cancelled.isFailure) return Result.fail(cancelled.error);
    return Result.ok(registration);
  }

  public async returnToPending(params: ReturnRegistrationToPendingParams): Promise<Result<Registration, DomainError>> {
    const registration = this.registrations.get(params.registrationId);
    if (!registration) return Result.fail(this.registrationNotFound(params.registrationId));
    const result = registration.returnToPending({ now: params.now });
    return result.isFailure ? Result.fail(result.error) : Result.ok(registration);
  }

  public async expireReservations(params: ExpireReservationsParams): Promise<number> {
    let expiredCount = 0;
    for (const registration of this.registrations.values()) {
      const result = registration.expireReservation({ now: params.now });
      if (result.isSuccess && result.value) expiredCount += 1;
    }
    return expiredCount;
  }

  private hasEventRoom(params: RegistrationCapacityCheckParams): boolean {
    return this.hasEventCapacityRoom(params) && this.hasBatchRoom(params);
  }

  private hasEventCapacityRoom(params: RegistrationCapacityCheckParams): boolean {
    if (params.eventCapacity === null) return true;
    const occupied = [...this.registrations.values()].filter((registration) => registration.eventId === params.eventId
      && registration.id.toString() !== params.excludedRegistrationId
      && registration.occupiesSeat({ now: params.now })).length;
    return occupied < params.eventCapacity;
  }

  private hasBatchRoom(params: RegistrationCapacityCheckParams): boolean {
    if (params.batchCapacity === null || params.batchId === null) return true;
    const occupied = [...this.registrations.values()].filter((registration) => registration.eventId === params.eventId
      && registration.ticketBatchId === params.batchId
      && registration.id.toString() !== params.excludedRegistrationId
      && registration.occupiesSeat({ now: params.now })).length;
    return occupied < params.batchCapacity;
  }

  private findDuplicate(registration: Registration): ConflictError | null {
    const duplicateId = this.registrations.has(registration.id.toString());
    const duplicateCode = [...this.registrations.values()].some((item) => item.code === registration.code);
    if (!duplicateId && !duplicateCode) return null;
    return new ConflictError({ code: 'REGISTRATION_CODE_CONFLICT', message: 'O código ou identificador da inscrição já está em uso.' });
  }

  private validateCouponLink(params: ValidateCouponLinkParams): ConflictError | ValidationError | null {
    const expectedCouponId = params.registration.pricing.couponId;
    if (expectedCouponId === null && params.coupon === null) return null;
    if (!params.coupon || params.coupon.id.toString() !== expectedCouponId) {
      return new ConflictError({ code: 'REGISTRATION_COUPON_MISMATCH', message: 'O cupom não corresponde ao desconto registrado.' });
    }
    return null;
  }

  private registrationNotFound(registrationId: RegistrationId): NotFoundError {
    return new NotFoundError({ code: 'REGISTRATION_NOT_FOUND', message: `Inscrição ${registrationId} não encontrada.` });
  }

  private page(params: RegistrationPageParams): Registration[] {
    const ordered = params.items.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    const offset = Math.max(0, params.offset ?? 0);
    const limit = params.limit ?? ordered.length;
    return ordered.slice(offset, offset + Math.max(0, limit));
  }
}
