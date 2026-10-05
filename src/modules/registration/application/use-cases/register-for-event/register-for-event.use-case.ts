import { UseCase } from '@core/application/use-case.base';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { COUPON_CATALOG } from '@core/contracts/coupon-catalog.contract';
import type { ICouponCatalog } from '@core/contracts/coupon-catalog.contract';
import { EVENT_CATALOG } from '@core/contracts/event-catalog.contract';
import type { IEventCatalog } from '@core/contracts/event-catalog.contract';
import { NOTIFICATION_GATEWAY } from '@core/contracts/notification.contract';
import type { INotificationGateway } from '@core/contracts/notification.contract';
import { PARTICIPANT_GATEWAY } from '@core/contracts/participant-gateway.contract';
import type { IParticipantGateway } from '@core/contracts/participant-gateway.contract';
import { RegistrationPolicyService } from '@core/domain/services/registration-policy.service';
import { LoteSelectionService } from '@core/domain/services/lote-selection.service';
import { Result } from '@core/domain/result';
import { validateAnswerValue } from '@core/domain/validators/answer.validator';
import type { AnswerFieldType } from '@core/domain/validators/answer.validator';
import { addMinutes } from '../../../../../shared/utils/date.util';
import { Registration } from '../../../domain/entities/registration.entity';
import { RegistrationDuplicatedError } from '../../../domain/errors/registration-duplicated.error';
import { FormValidationError } from '../../../domain/errors/form-validation.error';
import { REGISTRATION_REPOSITORY } from '../../../domain/repositories/registration-repository.interface';
import type { IRegistrationRepository } from '../../../domain/repositories/registration-repository.interface';
import { RegistrationPricingService } from '../../../domain/services/registration-pricing.service';
import { FormAnswer } from '../../../domain/value-objects/form-answer.vo';
import { RegistrationMapper } from '../../mappers/registration.mapper';
import type { RegisterForEventInputDto } from './register-for-event.input.dto';
import type { RegisterForEventOutputDto } from './register-for-event.output.dto';

export type RegisterForEventDependencies = {
  registrationRepository: IRegistrationRepository;
  eventCatalog: IEventCatalog;
  couponCatalog: ICouponCatalog;
  participantGateway: IParticipantGateway;
  notificationGateway: INotificationGateway;
  pricingService: RegistrationPricingService;
  policyService: RegistrationPolicyService;
  loteSelectionService: LoteSelectionService;
  clock: IClock;
  mapper: RegistrationMapper;
};

/**
 * Fluxo de inscrição (§10 e §11): valida formulário, verifica disponibilidade,
 * identifica lote, aplica desconto, cria a inscrição sob bloqueio de vaga e
 * confirma automaticamente quando não há cobrança.
 */
export class RegisterForEventUseCase extends UseCase<RegisterForEventInputDto, RegisterForEventOutputDto> {
  private readonly dependencies: RegisterForEventDependencies;

  constructor(dependencies: RegisterForEventDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: RegisterForEventInputDto): Promise<Result<RegisterForEventOutputDto>> {
    const { eventCatalog, participantGateway, clock } = this.dependencies;
    const at = clock.now();

    const eventId = input.eventId ?? (input.eventSlug
      ? await eventCatalog.findEventIdBySlug({ slug: input.eventSlug })
      : null);
    if (!eventId) return Result.fail(new Error('Evento não encontrado'));

    const rules = await eventCatalog.getRegistrationRules({ eventId });
    if (!rules) return Result.fail(new Error('Evento não encontrado'));

    // 1. O evento aceita inscrições? (§2, §3)
    const usage = await eventCatalog.getSeatUsage({ eventId });
    const policyResult = this.dependencies.policyService.execute({
      event: {
        status: rules.status,
        registrationStart: rules.registrationStart,
        registrationEnd: rules.registrationEnd,
        waitlistEnabled: rules.waitlistEnabled,
        availableSeats: usage?.availableSeats ?? 0,
        type: rules.type,
      },
      at,
      allowAdministrativeOverride: input.allowAdministrativeOverride ?? false,
    });
    if (policyResult.isFailure) return Result.fail(policyResult.error);
    const decision = policyResult.value;

    // 2. Formulário: campos, obrigatoriedade e formato das respostas (§8)
    const form = await eventCatalog.getRegistrationForm({ eventId });
    const answersResult = this.buildAnswers(form?.fields ?? [], input.answers);
    if (answersResult.isFailure) return Result.fail(answersResult.error);

    // 3. Cadastro principal do participante (§6)
    const participantResult = await participantGateway.resolveForRegistration({
      ...input.participant,
      consent: {
        termsVersion: input.consents.termsVersion,
        privacyVersion: input.consents.privacyVersion,
        marketingAccepted: input.consents.marketingAccepted,
        ip: input.ip ?? null,
      },
    });
    if (participantResult.status === 'INVALID') return Result.fail(new Error(participantResult.message));
    const participant = participantResult.participant;

    // 4. Lote vigente e valor (§5, §11)
    let loteId: string | null = null;
    let loteName: string | null = null;
    let basePriceCents = 0;
    if (rules.type === 'PAGO') {
      const lotes = await eventCatalog.listElegibleLotes({ eventId, at });
      const loteResult = this.dependencies.loteSelectionService.execute({ lotes, at });
      if (loteResult.isFailure) return Result.fail(loteResult.error);
      loteId = loteResult.value.id;
      loteName = loteResult.value.name;
      basePriceCents = loteResult.value.priceCents;
    }

    // 5. Cupom e cálculo do valor final (§24, §25)
    const coupon = input.couponCode
      ? await this.dependencies.couponCatalog.findApplicable({ eventId, code: input.couponCode, at })
      : null;
    if (input.couponCode && !coupon) return Result.fail(new Error('Cupom inválido ou fora da validade'));
    if (coupon && coupon.usedCount >= coupon.maxUses) return Result.fail(new Error('Cupom esgotado'));

    const priceResult = this.dependencies.pricingService.execute({
      basePriceCents,
      coupon: coupon
        ? { id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value }
        : null,
      isCourtesy: input.isCourtesy ?? false,
      courtesyReason: input.courtesyReason ?? null,
    });
    if (priceResult.isFailure) return Result.fail(priceResult.error);
    const price = priceResult.value;

    const reservationExpiresAt = this.resolveReservationExpiry({
      rules,
      decision: decision.outcome,
      at,
    });

    // 6. Criação sob bloqueio de vaga — impede ultrapassar a capacidade (§3)
    const registrationResult = await this.dependencies.registrationRepository.withSeatLock<Registration>({
      eventId,
      handler: async (context) => {
        const existing = await context.findActiveRegistration({ participantId: participant.id });
        if (existing) return Result.fail(new RegistrationDuplicatedError());

        const lockedUsage = await context.seatUsage();
        const lockedDecision = this.dependencies.policyService.execute({
          event: {
            status: rules.status,
            registrationStart: rules.registrationStart,
            registrationEnd: rules.registrationEnd,
            waitlistEnabled: rules.waitlistEnabled,
            availableSeats: lockedUsage.availableSeats,
            type: rules.type,
          },
          at,
          allowAdministrativeOverride: input.allowAdministrativeOverride ?? false,
        });
        if (lockedDecision.isFailure) return Result.fail(lockedDecision.error);

        const outcome = lockedDecision.value.outcome;
        const waitlistPosition = outcome === 'LISTA_ESPERA'
          ? await context.nextWaitlistPosition()
          : null;

        const registrationBuild = Registration.create({
          eventId,
          participantId: participant.id,
          loteId,
          loteName,
          priceCents: price.priceCents,
          discountCents: price.discountCents,
          couponId: price.couponId,
          couponCode: price.couponCode,
          isCourtesy: price.isCourtesy,
          courtesyReason: input.courtesyReason ?? null,
          answers: answersResult.value,
          formVersion: form?.version ?? 1,
          waitlistPosition,
          reservationExpiresAt:
            outcome === 'RESERVAR' && reservationExpiresAt ? reservationExpiresAt : null,
          createdBy: input.actorUserId ?? null,
        });
        if (registrationBuild.isFailure) return Result.fail(registrationBuild.error);

        await context.save(registrationBuild.value);
        return Result.ok(registrationBuild.value);
      },
    });
    if (registrationResult.isFailure) return Result.fail(registrationResult.error);

    const registration = registrationResult.value;

    // 7. Reserva do cupom (contador atômico). Se esgotar na concorrência,
    // a inscrição é cancelada para não manter benefício inválido (§25).
    if (price.couponId && price.couponCode) {
      const reservation = await this.dependencies.couponCatalog.reserve({
        eventId,
        code: price.couponCode,
        registrationId: registration.id.toString(),
        amountCents: price.finalAmountCents,
        at,
      });
      if (reservation.status !== 'RESERVED') {
        const cancelResult = registration.cancel({
          at,
          reason: 'Cupom indisponível no momento da confirmação da inscrição',
        });
        if (cancelResult.isSuccess) await this.dependencies.registrationRepository.update(registration);
        return Result.fail(new Error('Não foi possível reservar o cupom informado'));
      }
    }

    const isWaitlisted = registration.status.isWaitlisted();
    const requiresPayment = !isWaitlisted && registration.isPayable();

    await this.notify({
      registration,
      participantId: participant.id,
      destination: participant.email,
      waitlisted: isWaitlisted,
      requiresPayment,
    });

    return Result.ok({
      registration: this.dependencies.mapper.map({ registration }),
      participant: { id: participant.id, name: participant.name, email: participant.email },
      event: { id: eventId, title: rules.title, slug: rules.slug, type: rules.type, status: rules.status },
      requiresPayment,
      waitlisted: isWaitlisted,
      paymentOptions: {
        allowPix: rules.allowPix,
        allowBoleto: rules.allowBoleto,
        allowCreditCard: rules.allowCreditCard,
        maxInstallments: rules.maxInstallments,
        minInstallmentCents: rules.minInstallmentCents,
        reservationExpiresAt: registration.reservation.expiresAt,
      },
    });
  }

  private buildAnswers(
    fields: Array<{
      id: string;
      fieldKey: string;
      label: string;
      fieldType: string;
      isRequired: boolean;
      options: string[];
      isActive: boolean;
    }>,
    informed: Array<{ fieldKey: string; value: string | null }>,
  ): Result<FormAnswer[]> {
    const activeFields = fields.filter((field) => field.isActive);
    if (activeFields.length === 0) return Result.ok([]);

    const informedByKey = new Map(informed.map((answer) => [answer.fieldKey, answer.value]));
    const unknownKeys = informed.filter(
      (answer) => !activeFields.some((field) => field.fieldKey === answer.fieldKey),
    );
    if (unknownKeys.length > 0) {
      return Result.fail(new FormValidationError({
        message: `O formulário deste evento não possui o campo "${unknownKeys[0]?.fieldKey}"`,
        fieldKey: unknownKeys[0]?.fieldKey,
      }));
    }

    const answers: FormAnswer[] = [];
    for (const field of activeFields) {
      const validation = validateAnswerValue({
        label: field.label,
        fieldType: field.fieldType as AnswerFieldType,
        options: field.options,
        isRequired: field.isRequired,
        value: informedByKey.get(field.fieldKey) ?? null,
      });
      if (validation.isFailure) {
        return Result.fail(new FormValidationError({
          message: validation.error.message,
          fieldKey: field.fieldKey,
        }));
      }

      const answerResult = FormAnswer.create({
        fieldId: field.id,
        fieldKey: field.fieldKey,
        fieldLabel: field.label,
        fieldType: field.fieldType,
        value: validation.value,
      });
      if (answerResult.isFailure) return Result.fail(answerResult.error);
      answers.push(answerResult.value);
    }

    return Result.ok(answers);
  }

  private resolveReservationExpiry(params: {
    rules: { type: string; seatReservationMinutes: number };
    decision: 'OCUPAR' | 'RESERVAR' | 'LISTA_ESPERA';
    at: Date;
  }): Date | null {
    if (params.rules.type !== 'PAGO') return null;
    if (params.decision === 'LISTA_ESPERA') return null;
    return addMinutes(params.at, params.rules.seatReservationMinutes);
  }

  private async notify(params: {
    registration: Registration;
    participantId: string;
    destination: string;
    waitlisted: boolean;
    requiresPayment: boolean;
  }): Promise<void> {
    const template = params.waitlisted
      ? 'LISTA_ESPERA'
      : params.requiresPayment
        ? 'PAGAMENTO_PENDENTE'
        : 'INSCRICAO_CONFIRMADA';

    const registrationId = params.registration.id.toString();
    await this.dependencies.notificationGateway.send({
      template,
      registrationId,
      eventId: params.registration.eventId,
      participantId: params.participantId,
      destination: params.destination,
      variables: {
        codigo: params.registration.code.value,
        valor: params.registration.finalAmount.format(),
        posicao: String(params.registration.waitlistPosition ?? ''),
      },
    });
  }
}
