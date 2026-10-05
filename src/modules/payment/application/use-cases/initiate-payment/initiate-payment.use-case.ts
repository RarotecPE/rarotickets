import { UseCase } from '@core/application/use-case.base';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { EVENT_CATALOG } from '@core/contracts/event-catalog.contract';
import type { IEventCatalog } from '@core/contracts/event-catalog.contract';
import { PARTICIPANT_GATEWAY } from '@core/contracts/participant-gateway.contract';
import type { IParticipantGateway } from '@core/contracts/participant-gateway.contract';
import { PAYMENT_PROVIDER } from '@core/contracts/payment-provider.contract';
import type { IPaymentProvider } from '@core/contracts/payment-provider.contract';
import { REGISTRATION_GATEWAY } from '@core/contracts/registration-gateway.contract';
import type { IRegistrationGateway } from '@core/contracts/registration-gateway.contract';
import { Result } from '@core/domain/result';
import { MoneyVO } from '@core/domain/value-objects/money.vo';
import { addMinutesToDate } from '@core/domain/date.util';
import { Payment } from '../../../domain/entities/payment.entity';
import { PaymentNotFoundError } from '../../../domain/errors/payment-not-found.error';
import { PaymentNotAllowedError } from '../../../domain/errors/payment-not-allowed.error';
import { PAYMENT_REPOSITORY } from '../../../domain/repositories/payment-repository.interface';
import type { IPaymentRepository } from '../../../domain/repositories/payment-repository.interface';
import { referenceNumberFromId } from '../../../domain/services/reference-number.service';
import { InstallmentPlan } from '../../../domain/value-objects/installment-plan.vo';
import { PaymentMethod } from '../../../domain/value-objects/payment-method.vo';
import { PaymentReference } from '../../../domain/value-objects/payment-reference.vo';
import { PaymentTransaction } from '../../../domain/value-objects/payment-transaction.vo';
import { PaymentMapper } from '../../mappers/payment.mapper';
import type { InitiatePaymentInputDto } from './initiate-payment.input.dto';
import type { InitiatePaymentOutputDto } from './initiate-payment.output.dto';

const BOLETO_DUE_DAYS = 3;

export type InitiatePaymentDependencies = {
  paymentRepository: IPaymentRepository;
  registrationGateway: IRegistrationGateway;
  participantGateway: IParticipantGateway;
  eventCatalog: IEventCatalog;
  paymentProvider: IPaymentProvider;
  auditRecorder: IAuditRecorder;
  clock: IClock;
  mapper: PaymentMapper;
  notificationUrl: string;
  defaultReservationMinutes: number;
};

/**
 * Inicia a cobrança da inscrição (§13 a §17): valida forma de pagamento,
 * cria o pagamento interno, gera a cobrança no provedor e reserva a vaga.
 */
export class InitiatePaymentUseCase extends UseCase<InitiatePaymentInputDto, InitiatePaymentOutputDto> {
  private readonly dependencies: InitiatePaymentDependencies;

  constructor(dependencies: InitiatePaymentDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: InitiatePaymentInputDto): Promise<Result<InitiatePaymentOutputDto>> {
    const { paymentRepository, registrationGateway, eventCatalog, paymentProvider, clock, mapper } = this.dependencies;
    const at = clock.now();

    const snapshot = input.registrationId
      ? await registrationGateway.getSnapshot({ registrationId: input.registrationId })
      : null;
    if (!snapshot) return Result.fail(new PaymentNotFoundError(input.registrationCode ?? input.registrationId ?? ''));

    if (snapshot.status === 'CONFIRMADA') {
      return Result.fail(new PaymentNotAllowedError('Inscrição já está confirmada — não há valor a pagar'));
    }
    if (snapshot.status === 'CANCELADA' || snapshot.seatStatus === 'EXPIRADA') {
      return Result.fail(new PaymentNotAllowedError('Inscrição cancelada ou com reserva expirada não pode ser paga'));
    }
    if (snapshot.status === 'LISTA_ESPERA') {
      return Result.fail(new PaymentNotAllowedError('Inscrição em lista de espera não pode ser paga até ser promovida'));
    }
    if (snapshot.finalAmountCents <= 0) {
      return Result.fail(new PaymentNotAllowedError('Inscrição sem valor a pagar'));
    }

    const methodResult = PaymentMethod.create(input.method);
    if (methodResult.isFailure) return Result.fail(methodResult.error);
    const method = methodResult.value;

    const rules = await eventCatalog.getRegistrationRules({ eventId: snapshot.eventId });
    if (!rules) return Result.fail(new PaymentNotFoundError(snapshot.eventId));
    if (method.isPix() && !rules.allowPix) return Result.fail(new PaymentNotAllowedError('Este evento não aceita Pix'));
    if (method.isBoleto() && !rules.allowBoleto) return Result.fail(new PaymentNotAllowedError('Este evento não aceita boleto'));
    if (method.isCreditCard() && !rules.allowCreditCard) {
      return Result.fail(new PaymentNotAllowedError('Este evento não aceita cartão de crédito'));
    }

    const installments = method.isCreditCard() ? input.installments ?? 1 : 1;
    const planResult = InstallmentPlan.create({
      totalCents: snapshot.finalAmountCents,
      installments,
      maxInstallments: rules.maxInstallments,
      minInstallmentCents: rules.minInstallmentCents,
    });
    if (planResult.isFailure) return Result.fail(planResult.error);
    const plan = planResult.value;

    const existing = await paymentRepository.findByRegistrationId(snapshot.registrationId);
    const openPayment = existing.find((payment) => payment.status.isOpen() && payment.method.value === method.value);
    if (openPayment) {
      // Cobrança já existente: reaproveita a mesma referência (§17) sem duplicar.
      return Result.ok({
        payment: mapper.map({ payment: openPayment }),
        instructions: this.buildInstructions(openPayment, plan),
      });
    }

    const referenceResult = PaymentReference.create({
      eventNumber: referenceNumberFromId(snapshot.eventId),
      registrationNumber: referenceNumberFromId(snapshot.registrationId),
    });
    if (referenceResult.isFailure) return Result.fail(referenceResult.error);

    const seatReservationMinutes = snapshot.reservationExpiresAt
      ? Math.max(
          5,
          Math.round((snapshot.reservationExpiresAt.getTime() - at.getTime()) / 60_000),
        )
      : rules.seatReservationMinutes || this.dependencies.defaultReservationMinutes;

    const expiresAt = method.isBoleto()
      ? addMinutesToDate(at, BOLETO_DUE_DAYS * 24 * 60)
      : snapshot.reservationExpiresAt ?? addMinutesToDate(at, seatReservationMinutes);

    const paymentResult = Payment.create({
      registrationId: snapshot.registrationId,
      eventId: snapshot.eventId,
      participantId: snapshot.participantId,
      reference: referenceResult.value,
      method,
      amountCents: snapshot.finalAmountCents,
      installments: plan,
      expiresAt,
      providerName: paymentProvider.providerName,
      createdBy: input.actorUserId ?? null,
    });
    if (paymentResult.isFailure) return Result.fail(paymentResult.error);
    const payment = paymentResult.value;

    const participant = await this.dependencies.participantGateway.findById({ id: snapshot.participantId });

    const chargeResult = await paymentProvider.createCharge({
      reference: payment.reference.value,
      amountCents: snapshot.finalAmountCents,
      method: method.providerMethod,
      description: `Inscrição ${snapshot.code} — ${rules.title}`,
      customer: {
        name: participant?.name ?? input.actorName ?? 'Participante',
        email: participant?.email ?? '',
        cpf: participant?.cpf ?? null,
      },
      installments: plan.installments,
      expiresAt,
      notificationUrl: this.dependencies.notificationUrl,
      metadata: { registrationId: snapshot.registrationId, eventId: snapshot.eventId },
    });

    if (chargeResult.status === 'FAILED') {
      await paymentRepository.save(payment);
      await paymentRepository.saveEvent({
        paymentId: payment.id.toString(),
        registrationId: payment.registrationId,
        type: 'PAYMENT_PROVIDER_FAILED',
        fromStatus: payment.status.value,
        toStatus: payment.status.value,
        providerStatus: chargeResult.providerStatus ?? null,
        description: `Falha ao criar cobrança no provedor: ${chargeResult.message}`,
        actorUserId: input.actorUserId ?? null,
        actorName: input.actorName ?? null,
        occurredAt: at,
      });
      return Result.fail(new PaymentNotAllowedError(chargeResult.message));
    }

    const awaiting = payment.markAwaiting({
      providerChargeId: chargeResult.providerChargeId,
      providerStatus: chargeResult.providerStatus,
      transaction: PaymentTransaction.empty().withPaymentData({
        providerName: paymentProvider.providerName,
        qrCode: chargeResult.payload.qrCode,
        qrCodeImageUrl: chargeResult.payload.qrCodeImageUrl,
        qrCodeExpiresAt: chargeResult.payload.expiresAt,
        boletoLine: chargeResult.payload.boletoLine,
        boletoUrl: chargeResult.payload.boletoUrl,
        boletoDueDate: chargeResult.payload.boletoDueDate,
        cardBrand: chargeResult.payload.cardBrand,
        cardLast4: chargeResult.payload.cardLast4,
        authorizationCode: chargeResult.payload.authorizationCode,
      }),
      expiresAt: chargeResult.payload.expiresAt ?? chargeResult.payload.boletoDueDate ?? payment.expiresAt,
    });
    if (awaiting.isFailure) return Result.fail(awaiting.error);

    await paymentRepository.save(payment);
    await paymentRepository.saveEvent({
      paymentId: payment.id.toString(),
      registrationId: payment.registrationId,
      type: 'PAYMENT_CREATED',
      fromStatus: null,
      toStatus: payment.status.value,
      providerStatus: chargeResult.providerStatus,
      description: `Cobrança ${method.label} criada no provedor (${payment.reference.value})`,
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? null,
      occurredAt: at,
    });

    await registrationGateway.markAwaitingPayment({
      registrationId: payment.registrationId,
      paymentMethod: method.value,
      at,
      reservationExpiresAt: method.isBoleto() ? expiresAt : payment.expiresAt,
    });

    await this.dependencies.auditRecorder.record({
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? 'Participante',
      action: 'PAYMENT_CREATED',
      entity: 'payment',
      entityId: payment.id.toString(),
      description: `Pagamento ${payment.reference.value} de ${payment.amount.format()} criado (${method.label})`,
      after: { status: payment.status.value, reference: payment.reference.value, method: method.value },
      ip: input.ip ?? null,
    });

    return Result.ok({
      payment: mapper.map({ payment }),
      instructions: this.buildInstructions(payment, plan),
    });
  }

  private buildInstructions(payment: Payment, plan: InstallmentPlan): InitiatePaymentOutputDto['instructions'] {
    const transaction = payment.transaction;
    return {
      method: payment.method.value,
      qrCode: transaction.qrCode,
      qrCodeImageUrl: transaction.qrCodeImageUrl,
      boletoLine: transaction.boletoLine,
      boletoUrl: transaction.boletoUrl,
      boletoDueDate: transaction.boletoDueDate,
      expiresAt: transaction.qrCodeExpiresAt ?? transaction.boletoDueDate ?? payment.expiresAt,
      installments: plan.installments,
      installmentFormatted: MoneyVO.reconstitute({ cents: plan.installmentCents }).format(),
    };
  }
}
