import { UseCase } from '../../../../../@core/application/use-case.base.ts';
import type { IClock } from '../../../../../@core/application/clock.interface.ts';
import type { ICommunicationService, CommunicationChannel } from '../../../../../@core/application/communication.interface.ts';
import type { DomainError } from '../../../../../@core/domain/domain-error.base.ts';
import { NotFoundError, ValidationError } from '../../../../../@core/domain/errors/domain-errors.ts';
import { Result } from '../../../../../@core/domain/result.ts';
import type { IEventRepository } from '../../../../event/domain/repositories/event-repository.interface.ts';
import type { ITicketBatchRepository } from '../../../../event/domain/repositories/ticket-batch-repository.interface.ts';
import type { IRegistrationRepository } from '../../../../registration/domain/repositories/registration-repository.interface.ts';
import type { Registration } from '../../../../registration/domain/entities/registration.aggregate.ts';
import { Payment } from '../../../domain/entities/payment.aggregate.ts';
import type { PaymentStatus } from '../../../domain/entities/payment.aggregate.ts';
import { PaymentNotification } from '../../../domain/entities/payment-notification.entity.ts';
import type { IPaymentNotificationRepository } from '../../../domain/repositories/payment-notification-repository.interface.ts';
import type { IPaymentRepository } from '../../../domain/repositories/payment-repository.interface.ts';
import type { ProcessPaymentNotificationInputDto } from './process-payment-notification.input.dto.ts';
import type { ProcessPaymentNotificationOutputDto } from './process-payment-notification.output.dto.ts';

export type ProcessPaymentNotificationDependencies = {
  paymentRepository: IPaymentRepository;
  notificationRepository: IPaymentNotificationRepository;
  registrationRepository: IRegistrationRepository;
  eventRepository: IEventRepository;
  ticketBatchRepository: ITicketBatchRepository;
  communication: ICommunicationService;
  communicationChannels: CommunicationChannel[];
  clock: IClock;
  processingLeaseMilliseconds: number;
};
export type ProcessedRegistrationPayment = { registration: Registration | null; confirmedNow: boolean };
export type PaymentNotificationOutcome = {
  payment: Payment;
  registration: Registration | null;
  duplicate: boolean;
  confirmedNow: boolean;
};
export type NotificationPaymentLookupParams = { internalReference: string | null; externalTransactionId: string | null };
export type NotificationRegistrationParams = { payment: Payment; status: PaymentStatus; now: Date };
export type NotificationErrorParams = { notification: PaymentNotification; now: Date; error: DomainError };

export class ProcessPaymentNotificationUseCase extends UseCase<ProcessPaymentNotificationInputDto, ProcessPaymentNotificationOutputDto, DomainError> {
  private readonly paymentRepository: IPaymentRepository;
  private readonly notificationRepository: IPaymentNotificationRepository;
  private readonly registrationRepository: IRegistrationRepository;
  private readonly eventRepository: IEventRepository;
  private readonly ticketBatchRepository: ITicketBatchRepository;
  private readonly communication: ICommunicationService;
  private readonly communicationChannels: CommunicationChannel[];
  private readonly clock: IClock;
  private readonly processingLeaseMilliseconds: number;

  constructor(dependencies: ProcessPaymentNotificationDependencies) {
    super();
    this.paymentRepository = dependencies.paymentRepository;
    this.notificationRepository = dependencies.notificationRepository;
    this.registrationRepository = dependencies.registrationRepository;
    this.eventRepository = dependencies.eventRepository;
    this.ticketBatchRepository = dependencies.ticketBatchRepository;
    this.communication = dependencies.communication;
    this.communicationChannels = [...dependencies.communicationChannels];
    this.clock = dependencies.clock;
    this.processingLeaseMilliseconds = dependencies.processingLeaseMilliseconds;
  }

  public async execute(input: ProcessPaymentNotificationInputDto): Promise<Result<ProcessPaymentNotificationOutputDto, DomainError>> {
    const now = this.clock.now();
    const notificationResult = PaymentNotification.create({
      provider: 'PAGBANK',
      externalNotificationId: input.externalNotificationId,
      internalReference: input.internalReference,
      externalTransactionId: input.externalTransactionId,
      status: input.status,
      financialOperationId: input.financialOperationId,
      financialAmountInMinorUnits: input.financialAmountInMinorUnits,
      financialReason: input.financialReason,
      payloadDigest: input.payloadDigest,
      receivedAt: now,
    });
    if (notificationResult.isFailure) return Result.fail(notificationResult.error);
    const claim = await this.notificationRepository.claimForProcessing({
      notification: notificationResult.value,
      now,
      leaseMilliseconds: this.processingLeaseMilliseconds,
    });
    if (claim.isFailure) return Result.fail(claim.error);
    if (!claim.value.claimed) {
      return Result.ok({ duplicate: claim.value.wasDuplicate, paymentStatus: null, registrationStatus: null, registrationConfirmed: false });
    }

    const payment = await this.findPayment({
      internalReference: input.internalReference,
      externalTransactionId: input.externalTransactionId,
    });
    if (!payment) {
      const error = new NotFoundError({ code: 'NOTIFICATION_PAYMENT_NOT_FOUND', message: 'A notificação não corresponde a um pagamento interno.' });
      await this.markFailed({ notification: claim.value.notification, now, error });
      return Result.fail(error);
    }
    const statusResult = this.applyNormalizedStatus({ payment, input, now });
    if (statusResult.isFailure) {
      await this.markFailed({ notification: claim.value.notification, now, error: statusResult.error });
      return Result.fail(statusResult.error);
    }
    const paymentSave = await this.paymentRepository.save(payment);
    if (paymentSave.isFailure) {
      await this.markFailed({ notification: claim.value.notification, now, error: paymentSave.error });
      return Result.fail(paymentSave.error);
    }

    const registrationResult = await this.applyRegistrationStatus({ payment, status: input.status, now });
    if (registrationResult.isFailure) {
      await this.markFailed({ notification: claim.value.notification, now, error: registrationResult.error });
      return Result.fail(registrationResult.error);
    }
    const marked = claim.value.notification.markProcessed(now);
    if (marked.isFailure) {
      await this.markFailed({ notification: claim.value.notification, now, error: marked.error });
      return Result.fail(marked.error);
    }
    const savedNotification = await this.notificationRepository.save(claim.value.notification);
    if (savedNotification.isFailure) return Result.fail(savedNotification.error);
    await this.enqueueConfirmation({ payment, registration: registrationResult.value.registration, confirmedNow: registrationResult.value.confirmedNow });
    return Result.ok({
      duplicate: claim.value.wasDuplicate,
      paymentStatus: payment.status,
      registrationStatus: registrationResult.value.registration?.status ?? null,
      registrationConfirmed: registrationResult.value.confirmedNow,
    });
  }

  private async findPayment(params: NotificationPaymentLookupParams): Promise<Payment | null> {
    if (params.externalTransactionId) {
      const byExternalId = await this.paymentRepository.findByExternalTransactionId(params.externalTransactionId);
      if (byExternalId) return byExternalId;
    }
    return params.internalReference
      ? this.paymentRepository.findByInternalReference(params.internalReference)
      : null;
  }

  private applyNormalizedStatus(params: {
    payment: Payment;
    input: ProcessPaymentNotificationInputDto;
    now: Date;
  }): Result<void, DomainError> {
    if (params.input.status === 'ESTORNADO') {
      const remaining = params.payment.amountInMinorUnits - params.payment.refundedAmountInMinorUnits;
      if (params.input.financialAmountInMinorUnits !== remaining || !params.input.financialOperationId || !params.input.financialReason) {
        return Result.fail(new ValidationError({ code: 'REFUND_NOTIFICATION_AMOUNT_INVALID', message: 'O estorno notificado não corresponde ao saldo financeiro do pagamento.' }));
      }
      const refund = params.payment.recordRefund({
        operationId: params.input.financialOperationId,
        amountInMinorUnits: params.input.financialAmountInMinorUnits,
        reason: params.input.financialReason,
        actorId: 'PAGBANK',
        occurredAt: params.now,
        succeeded: true,
        resultDescription: 'Estorno confirmado pela notificação do provedor.',
      });
      return refund.isFailure ? Result.fail(refund.error) : Result.ok();
    }
    const applied = params.payment.applyStatus({
      status: params.input.status,
      occurredAt: params.now,
      externalTransactionId: params.input.externalTransactionId,
      providerStatusCode: null,
      reason: null,
    });
    return applied.isFailure ? Result.fail(applied.error) : Result.ok();
  }

  private async applyRegistrationStatus(params: NotificationRegistrationParams): Promise<Result<ProcessedRegistrationPayment, DomainError>> {
    const registration = await this.registrationRepository.findById(params.payment.registrationId);
    if (!registration) {
      return Result.fail(new NotFoundError({ code: 'PAYMENT_REGISTRATION_NOT_FOUND', message: 'A inscrição associada ao pagamento não foi encontrada.' }));
    }
    if (params.payment.status === 'PAGO') return this.confirmRegistration({ payment: params.payment, registration, now: params.now });
    if ((params.status === 'RECUSADO' || params.status === 'CANCELADO' || params.status === 'EXPIRADO')
      && registration.status === 'AGUARDANDO_PAGAMENTO') {
      const reset = await this.registrationRepository.returnToPending({ registrationId: registration.id.toString(), now: params.now });
      if (reset.isFailure) return Result.fail(reset.error);
      return Result.ok({ registration: reset.value, confirmedNow: false });
    }
    return Result.ok({ registration, confirmedNow: false });
  }

  private async confirmRegistration(params: {
    payment: Payment;
    registration: Registration;
    now: Date;
  }): Promise<Result<ProcessedRegistrationPayment, DomainError>> {
    const wasAlreadyConfirmed = params.registration.status === 'CONFIRMADA';
    const event = await this.eventRepository.findById(params.registration.eventId);
    if (!event) return Result.fail(new NotFoundError({ code: 'PAYMENT_EVENT_NOT_FOUND', message: 'O evento associado à inscrição não foi encontrado.' }));
    let batchCapacity: number | null = null;
    if (params.registration.ticketBatchId) {
      const batch = await this.ticketBatchRepository.findById(params.registration.ticketBatchId);
      if (!batch) return Result.fail(new NotFoundError({ code: 'PAYMENT_BATCH_NOT_FOUND', message: 'O lote da inscrição não foi encontrado.' }));
      batchCapacity = batch.maxQuantity;
    }
    const confirmed = await this.registrationRepository.confirmPaidAtomically({
      registrationId: params.registration.id.toString(),
      payment: { paymentId: params.payment.id.toString(), now: params.now },
      eventCapacity: event.capacity,
      batchCapacity,
    });
    if (confirmed.isFailure) return Result.fail(confirmed.error);
    return Result.ok({ registration: confirmed.value, confirmedNow: !wasAlreadyConfirmed });
  }

  private async enqueueConfirmation(params: {
    payment: Payment;
    registration: Registration | null;
    confirmedNow: boolean;
  }): Promise<void> {
    if (!params.confirmedNow || !params.registration) return;
    await this.communication.enqueue({
      trigger: 'PAYMENT_CONFIRMED',
      eventId: params.payment.eventId,
      registrationId: params.registration.id.toString(),
      participantId: params.registration.participantId,
      channels: this.communicationChannels,
    });
  }

  private async markFailed(params: NotificationErrorParams): Promise<void> {
    const failed = params.notification.markFailed({ now: params.now, reason: params.error.message });
    if (failed.isSuccess) await this.notificationRepository.save(params.notification);
  }
}
