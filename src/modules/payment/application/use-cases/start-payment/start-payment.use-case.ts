import { UseCase } from '../../../../../@core/application/use-case.base.ts';
import type { IAuthorizationService } from '../../../../../@core/application/authorization.interface.ts';
import type { IClock } from '../../../../../@core/application/clock.interface.ts';
import type { ICommunicationService, CommunicationChannel, CommunicationTrigger } from '../../../../../@core/application/communication.interface.ts';
import type { IIdGenerator } from '../../../../../@core/application/id-generator.interface.ts';
import type { DomainError } from '../../../../../@core/domain/domain-error.base.ts';
import { ForbiddenError, InvalidStateError, NotFoundError, ValidationError } from '../../../../../@core/domain/errors/domain-errors.ts';
import { Result } from '../../../../../@core/domain/result.ts';
import type { Event } from '../../../../event/domain/entities/event.aggregate.ts';
import type { IEventRepository } from '../../../../event/domain/repositories/event-repository.interface.ts';
import type { ITicketBatchRepository } from '../../../../event/domain/repositories/ticket-batch-repository.interface.ts';
import type { IRegistrationRepository } from '../../../../registration/domain/repositories/registration-repository.interface.ts';
import type { Registration } from '../../../../registration/domain/entities/registration.aggregate.ts';
import { Payment } from '../../../domain/entities/payment.aggregate.ts';
import type { PaymentInstructions, PaymentSnapshot } from '../../../domain/entities/payment.aggregate.ts';
import type { IPaymentRepository } from '../../../domain/repositories/payment-repository.interface.ts';
import type { IPaymentGateway, GatewayChargeResult } from '../../../domain/services/payment-gateway.interface.ts';
import type { StartPaymentInputDto } from './start-payment.input.dto.ts';
import type { StartPaymentOutputDto } from './start-payment.output.dto.ts';

export type StartPaymentDependencies = {
  eventRepository: IEventRepository;
  ticketBatchRepository: ITicketBatchRepository;
  registrationRepository: IRegistrationRepository;
  paymentRepository: IPaymentRepository;
  paymentGateway: IPaymentGateway;
  authorization: IAuthorizationService;
  communication: ICommunicationService;
  communicationChannels: CommunicationChannel[];
  clock: IClock;
  idGenerator: IIdGenerator;
};
export type PaymentOwnerAuthorizationParams = { input: StartPaymentInputDto; registration: Registration };
export type PrepareStartPaymentParams = { input: StartPaymentInputDto; registration: Registration; event: Event; now: Date };
export type CreatedPaymentResult = { payment: Payment; wasCreated: boolean };
export type CreatePendingPaymentParams = { input: StartPaymentInputDto; registration: Registration; event: Event; now: Date };
export type UpdatePaymentFromChargeParams = { payment: Payment; charge: GatewayChargeResult; now: Date };
export type ApplyPaidResultOutput = { registration: Registration; confirmed: boolean };
export type ApplyPaidResultParams = {
  payment: Payment;
  registration: Registration;
  event: Event;
  batchCapacity: number | null;
  now: Date;
};
export type PaymentOutputParams = { payment: Payment; registration: Registration; confirmed: boolean; communicationQueued: boolean };
export type PaymentCancellationParams = { payment: Payment; now: Date };
export type ProcessChargeParams = {
  payment: Payment;
  registration: Registration;
  event: Event;
  input: StartPaymentInputDto;
  now: Date;
  batchCapacity: number | null;
};
export type StartPaymentCommunicationParams = {
  payment: Payment;
  eventId: string;
  registrationId: string;
  participantId: string;
};

export class StartPaymentUseCase extends UseCase<StartPaymentInputDto, StartPaymentOutputDto, DomainError> {
  private readonly eventRepository: IEventRepository;
  private readonly ticketBatchRepository: ITicketBatchRepository;
  private readonly registrationRepository: IRegistrationRepository;
  private readonly paymentRepository: IPaymentRepository;
  private readonly paymentGateway: IPaymentGateway;
  private readonly authorization: IAuthorizationService;
  private readonly communication: ICommunicationService;
  private readonly communicationChannels: CommunicationChannel[];
  private readonly clock: IClock;
  private readonly idGenerator: IIdGenerator;

  constructor(dependencies: StartPaymentDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
    this.ticketBatchRepository = dependencies.ticketBatchRepository;
    this.registrationRepository = dependencies.registrationRepository;
    this.paymentRepository = dependencies.paymentRepository;
    this.paymentGateway = dependencies.paymentGateway;
    this.authorization = dependencies.authorization;
    this.communication = dependencies.communication;
    this.communicationChannels = [...dependencies.communicationChannels];
    this.clock = dependencies.clock;
    this.idGenerator = dependencies.idGenerator;
  }

  public async execute(input: StartPaymentInputDto): Promise<Result<StartPaymentOutputDto, DomainError>> {
    const now = this.clock.now();
    const registration = await this.registrationRepository.findById(input.registrationId);
    if (!registration) return Result.fail(new NotFoundError({ code: 'REGISTRATION_NOT_FOUND', message: 'Inscrição não encontrada.' }));
    const owner = await this.authorizePaymentOwner({ input, registration });
    if (owner.isFailure) return Result.fail(owner.error);
    const event = await this.eventRepository.findById(registration.eventId);
    if (!event) return Result.fail(new NotFoundError({ code: 'EVENT_NOT_FOUND', message: 'Evento não encontrado.' }));
    const readiness = this.validatePaymentReadiness({ input, registration, event, now });
    if (readiness.isFailure) return Result.fail(readiness.error);
    const batchCapacity = await this.resolveBatchCapacity(registration);
    if (batchCapacity.isFailure) return Result.fail(batchCapacity.error);

    const currentPayment = await this.paymentRepository.findOpenByRegistration({ registrationId: registration.id.toString(), now });
    if (!currentPayment) {
      const priorPayments = await this.paymentRepository.listByRegistration({ registrationId: registration.id.toString() });
      const paidAttempt = priorPayments.find((payment) => payment.status === 'PAGO' || payment.status === 'ESTORNADO');
      if (paidAttempt) {
        return Result.fail(new InvalidStateError({ code: 'REGISTRATION_HAS_SETTLED_PAYMENT', message: 'A inscrição possui um pagamento liquidado e não pode gerar outra cobrança.' }));
      }
      if (registration.status === 'AGUARDANDO_PAGAMENTO') {
        const reset = await this.registrationRepository.returnToPending({ registrationId: registration.id.toString(), now });
        if (reset.isFailure) return Result.fail(reset.error);
      }
    }

    const paymentResult = currentPayment
      ? Result.ok<CreatedPaymentResult, DomainError>({ payment: currentPayment, wasCreated: false })
      : await this.createPendingPayment({ input, registration, event, now });
    if (paymentResult.isFailure) return Result.fail(paymentResult.error);
    const payment = paymentResult.value.payment;
    const started = await this.registrationRepository.startPaymentAtomically({
      registrationId: registration.id.toString(),
      paymentId: payment.id.toString(),
      eventCapacity: event.capacity,
      batchCapacity: batchCapacity.value,
      reservation: { now, reservationDurationMinutes: event.payment.reservationDurationMinutes },
    });
    if (started.isFailure) {
      if (paymentResult.value.wasCreated) await this.cancelUnstartedPayment({ payment, now });
      return Result.fail(started.error);
    }
    if (payment.externalTransactionId) {
      return Result.ok(this.output({
        payment,
        registration: started.value,
        confirmed: false,
        communicationQueued: false,
      }));
    }
    const result = await this.createGatewayCharge({ payment, registration, event, input, now, batchCapacity: batchCapacity.value });
    if (result.isFailure) return Result.fail(result.error);
    return Result.ok(result.value);
  }

  private async authorizePaymentOwner(params: PaymentOwnerAuthorizationParams): Promise<Result<void, DomainError>> {
    if (params.input.participantId === params.registration.participantId) return Result.ok();
    if (!params.input.actorId?.trim()) {
      return Result.fail(new ForbiddenError({ code: 'PAYMENT_OWNER_MISMATCH', message: 'A inscrição pertence a outro participante.' }));
    }
    const permission = await this.authorization.authorize({ actorId: params.input.actorId, permission: 'payment:create' });
    if (permission.isFailure) return Result.fail(permission.error);
    if (!permission.value) {
      return Result.fail(new ForbiddenError({ code: 'PAYMENT_PERMISSION_DENIED', message: 'O usuário não pode iniciar pagamento para esta inscrição.' }));
    }
    return Result.ok();
  }

  private validatePaymentReadiness(params: PrepareStartPaymentParams): Result<void, DomainError> {
    if (params.event.status === 'CANCELADO') {
      return Result.fail(new InvalidStateError({ code: 'EVENT_CANCELLED', message: 'Não é possível iniciar pagamento para um evento cancelado.' }));
    }
    if (!params.registration.requiresPayment || params.registration.status === 'CONFIRMADA'
      || params.registration.status === 'CANCELADA' || params.registration.status === 'LISTA_ESPERA') {
      return Result.fail(new InvalidStateError({ code: 'REGISTRATION_NOT_PAYABLE', message: 'A inscrição não está disponível para pagamento.' }));
    }
    if (!params.event.payment.allowedMethods.includes(params.input.method)) {
      return Result.fail(new InvalidStateError({ code: 'PAYMENT_METHOD_NOT_ALLOWED', message: 'A forma de pagamento não está habilitada para este evento.' }));
    }
    if (params.input.method === 'CARTAO_CREDITO' && !params.input.paymentInstrumentToken?.trim()) {
      return Result.fail(new ValidationError({ code: 'CARD_TOKEN_REQUIRED', message: 'O cartão deve ser tokenizado antes de iniciar o pagamento.' }));
    }
    return Result.ok();
  }

  private async resolveBatchCapacity(registration: Registration): Promise<Result<number | null, DomainError>> {
    if (!registration.ticketBatchId) {
      return Result.fail(new InvalidStateError({ code: 'REGISTRATION_BATCH_REQUIRED', message: 'A inscrição paga não possui lote associado.' }));
    }
    const batch = await this.ticketBatchRepository.findById(registration.ticketBatchId);
    if (!batch || batch.eventId !== registration.eventId) {
      return Result.fail(new NotFoundError({ code: 'TICKET_BATCH_NOT_FOUND', message: 'O lote da inscrição não foi encontrado.' }));
    }
    return Result.ok(batch.maxQuantity);
  }

  private async createPendingPayment(params: CreatePendingPaymentParams): Promise<Result<CreatedPaymentResult, DomainError>> {
    const created = Payment.create({
      id: this.idGenerator.generate({ purpose: 'payment' }),
      eventId: params.event.id.toString(),
      registrationId: params.registration.id.toString(),
      registrationCode: params.registration.code,
      amountInMinorUnits: params.registration.pricing.finalAmountInMinorUnits,
      method: params.input.method,
      allowedMethods: params.event.payment.allowedMethods,
      installments: params.input.installments,
      maximumInstallments: params.event.payment.maxInstallments,
      cardBrand: params.input.cardBrand,
      cardLastFourDigits: params.input.cardLastFourDigits,
      now: params.now,
    });
    if (created.isFailure) return Result.fail(created.error);
    const persisted = await this.paymentRepository.createPendingIfAbsent({ payment: created.value, now: params.now });
    return persisted.isFailure
      ? Result.fail(persisted.error)
      : Result.ok({ payment: persisted.value.payment, wasCreated: persisted.value.wasCreated });
  }

  private async createGatewayCharge(params: ProcessChargeParams): Promise<Result<StartPaymentOutputDto, DomainError>> {
    const charge = await this.paymentGateway.createCharge({
      internalPaymentId: params.payment.id.toString(),
      idempotencyKey: params.payment.id.toString(),
      internalReference: params.payment.internalReference,
      amountInMinorUnits: params.payment.amountInMinorUnits,
      method: params.payment.method,
      installments: params.payment.installments,
      paymentInstrumentToken: params.payment.method === 'CARTAO_CREDITO' ? params.input.paymentInstrumentToken : null,
      customer: params.input.customer,
    });
    if (charge.isFailure) return Result.fail(charge.error);
    const updated = this.updatePaymentFromCharge({ payment: params.payment, charge: charge.value, now: params.now });
    if (updated.isFailure) return Result.fail(updated.error);
    const saved = await this.paymentRepository.save(params.payment);
    if (saved.isFailure) return Result.fail(saved.error);
    const confirmed = await this.applyPaidResult({
      payment: params.payment,
      registration: params.registration,
      event: params.event,
      batchCapacity: params.batchCapacity,
      now: params.now,
    });
    if (confirmed.isFailure) return Result.fail(confirmed.error);
    const queued = await this.enqueuePaymentCommunication({
      payment: params.payment,
      eventId: params.event.id.toString(),
      registrationId: params.registration.id.toString(),
      participantId: params.registration.participantId,
    });
    return Result.ok(this.output({
      payment: params.payment,
      registration: confirmed.value.registration,
      confirmed: confirmed.value.confirmed,
      communicationQueued: queued,
    }));
  }

  private updatePaymentFromCharge(params: UpdatePaymentFromChargeParams): Result<void, DomainError> {
    const details = params.payment.recordChargeDetails({
      externalTransactionId: params.charge.externalTransactionId,
      providerStatusCode: params.charge.providerStatusCode,
      expiresAt: params.charge.expiresAt,
      instructions: params.charge.instructions,
      occurredAt: params.now,
    });
    if (details.isFailure) return Result.fail(details.error);
    const applied = params.payment.applyStatus({
      status: params.charge.normalizedStatus,
      occurredAt: params.now,
      externalTransactionId: params.charge.externalTransactionId,
      providerStatusCode: params.charge.providerStatusCode,
      reason: null,
    });
    return applied.isFailure ? Result.fail(applied.error) : Result.ok();
  }

  private async applyPaidResult(params: ApplyPaidResultParams): Promise<Result<ApplyPaidResultOutput, DomainError>> {
    if (params.payment.status === 'PAGO') {
      const result = await this.registrationRepository.confirmPaidAtomically({
        registrationId: params.registration.id.toString(),
        payment: { paymentId: params.payment.id.toString(), now: params.now },
        eventCapacity: params.event.capacity,
        batchCapacity: params.batchCapacity,
      });
      return result.isFailure ? Result.fail(result.error) : Result.ok({ registration: result.value, confirmed: true });
    }
    if (params.payment.status === 'RECUSADO' || params.payment.status === 'CANCELADO' || params.payment.status === 'EXPIRADO') {
      const reset = await this.registrationRepository.returnToPending({ registrationId: params.registration.id.toString(), now: params.now });
      return reset.isFailure ? Result.fail(reset.error) : Result.ok({ registration: reset.value, confirmed: false });
    }
    return Result.ok({ registration: params.registration, confirmed: false });
  }

  private async enqueuePaymentCommunication(params: StartPaymentCommunicationParams): Promise<boolean> {
    const trigger = this.paymentCommunicationTrigger(params.payment);
    const result = await this.communication.enqueue({
      trigger,
      eventId: params.eventId,
      registrationId: params.registrationId,
      participantId: params.participantId,
      channels: this.communicationChannels,
    });
    return result.isSuccess;
  }

  private paymentCommunicationTrigger(payment: Payment): CommunicationTrigger {
    if (payment.status === 'PAGO') return 'PAYMENT_CONFIRMED';
    if (payment.status === 'RECUSADO') return 'PAYMENT_FAILED';
    return 'PAYMENT_PENDING';
  }

  private output(params: PaymentOutputParams): StartPaymentOutputDto {
    const payment: PaymentSnapshot = params.payment.snapshot();
    const instructions: PaymentInstructions = params.payment.instructions;
    return {
      payment,
      instructions,
      registrationStatus: params.registration.status,
      registrationConfirmed: params.confirmed,
      communicationQueued: params.communicationQueued,
    };
  }

  private async cancelUnstartedPayment(params: PaymentCancellationParams): Promise<void> {
    const cancelled = params.payment.applyStatus({
      status: 'CANCELADO',
      occurredAt: params.now,
      externalTransactionId: null,
      providerStatusCode: null,
      reason: 'A vaga não pôde ser reservada.',
    });
    if (cancelled.isSuccess) await this.paymentRepository.save(params.payment);
  }
}
