import { AggregateRoot } from '../../../../@core/domain/aggregate-root.base.ts';
import type { EntityConstructorParams } from '../../../../@core/domain/entity.base.ts';
import { Identifier } from '../../../../@core/domain/identifier.ts';
import { Result } from '../../../../@core/domain/result.ts';
import { ConflictError, InvalidStateError, ValidationError } from '../../../../@core/domain/errors/domain-errors.ts';
import { RegistrationPricing } from '../value-objects/registration-pricing.vo.ts';
import type { RegistrationPricingProps } from '../value-objects/registration-pricing.vo.ts';

export type RegistrationStatus = 'PENDENTE' | 'AGUARDANDO_PAGAMENTO' | 'CONFIRMADA' | 'CANCELADA' | 'LISTA_ESPERA';
export type RegistrationEventKind = 'GRATUITO' | 'PAGO';
export type RegistrationConfirmationMethod = 'GRATUITA' | 'PAGAMENTO' | 'CORTESIA' | 'ISENCAO' | 'MANUAL';
export type RegistrationFileAnswer = { fileId: string; fileName: string; mediaType: string; sizeBytes: number };
export type RegistrationAnswer = string | number | boolean | string[] | RegistrationFileAnswer;
export type RegistrationAnswers = Record<string, RegistrationAnswer | null>;
export type RegistrationCancellation = { actorId: string; reason: string; cancelledAt: Date };
export type ManualConfirmation = { actorId: string; reason: string; confirmedAt: Date };
export type RegistrationProps = {
  code: string;
  eventId: string;
  participantId: string;
  eventKind: RegistrationEventKind;
  ticketBatchId: string | null;
  pricing: RegistrationPricing;
  status: RegistrationStatus;
  formId: string | null;
  formVersion: number | null;
  formSchemaSnapshotJson: string | null;
  answers: RegistrationAnswers;
  reservationExpiresAt: Date | null;
  confirmationMethod: RegistrationConfirmationMethod | null;
  confirmedAt: Date | null;
  paymentAttemptIds: string[];
  cancellation: RegistrationCancellation | null;
  manualConfirmation: ManualConfirmation | null;
};
export type CreateRegistrationParams = {
  id?: string;
  code: string;
  eventId: string;
  participantId: string;
  eventKind: RegistrationEventKind;
  ticketBatchId: string | null;
  pricing: RegistrationPricing;
  formId: string | null;
  formVersion: number | null;
  formSchemaSnapshotJson: string | null;
  answers: RegistrationAnswers;
  reservationExpiresAt: Date | null;
  isWaitlisted: boolean;
  now: Date;
};
export type CurrentTimeParams = { now: Date };
export type StartPaymentParams = { now: Date; reservationDurationMinutes: number | null };
export type StartPaymentWithAttemptParams = StartPaymentParams & { paymentId: string };
export type ConfirmPaidRegistrationParams = { paymentId: string; now: Date };
export type ConfirmRegistrationAdministrativelyParams = { actorId: string; reason: string; now: Date };
export type CancelRegistrationParams = { actorId: string; reason: string; now: Date };
export type PaymentAttemptParams = { paymentId: string; now: Date };
export type RegistrationSnapshot = {
  id: string;
  code: string;
  eventId: string;
  participantId: string;
  eventKind: RegistrationEventKind;
  ticketBatchId: string | null;
  pricing: RegistrationPricingProps;
  status: RegistrationStatus;
  formId: string | null;
  formVersion: number | null;
  formSchemaSnapshotJson: string | null;
  answers: RegistrationAnswers;
  reservationExpiresAt: Date | null;
  confirmationMethod: RegistrationConfirmationMethod | null;
  confirmedAt: Date | null;
  paymentAttemptIds: string[];
  cancellation: RegistrationCancellation | null;
  manualConfirmation: ManualConfirmation | null;
  createdAt: Date;
  updatedAt: Date;
};

export class Registration extends AggregateRoot<RegistrationProps> {
  private constructor(params: EntityConstructorParams<RegistrationProps>) {
    super(params);
  }

  public static create(params: CreateRegistrationParams): Result<Registration, ValidationError> {
    const error = this.validate(params);
    if (error) return Result.fail(error);
    const hasNoCharge = params.eventKind === 'GRATUITO' || params.pricing.finalAmountInMinorUnits === 0;
    const status: RegistrationStatus = params.isWaitlisted
      ? 'LISTA_ESPERA'
      : hasNoCharge ? 'CONFIRMADA' : 'PENDENTE';
    const props: RegistrationProps = {
      code: params.code.trim(),
      eventId: params.eventId,
      participantId: params.participantId,
      eventKind: params.eventKind,
      ticketBatchId: params.ticketBatchId,
      pricing: params.pricing,
      status,
      formId: params.formId,
      formVersion: params.formVersion,
      formSchemaSnapshotJson: params.formSchemaSnapshotJson,
      answers: this.copyAnswers(params.answers),
      reservationExpiresAt: params.isWaitlisted || !params.reservationExpiresAt
        ? null : new Date(params.reservationExpiresAt.getTime()),
      confirmationMethod: status === 'CONFIRMADA' ? this.initialConfirmationMethod(params) : null,
      confirmedAt: status === 'CONFIRMADA' ? new Date(params.now.getTime()) : null,
      paymentAttemptIds: [],
      cancellation: null,
      manualConfirmation: null,
    };
    const entityParams: EntityConstructorParams<RegistrationProps> = {
      props,
      createdAt: params.now,
      updatedAt: params.now,
    };
    if (params.id) entityParams.id = Identifier.fromExisting(params.id);
    return Result.ok(new Registration(entityParams));
  }

  public get code(): string { return this.props.code; }
  public get eventId(): string { return this.props.eventId; }
  public get participantId(): string { return this.props.participantId; }
  public get eventKind(): RegistrationEventKind { return this.props.eventKind; }
  public get ticketBatchId(): string | null { return this.props.ticketBatchId; }
  public get pricing(): RegistrationPricing { return this.props.pricing; }
  public get status(): RegistrationStatus { return this.props.status; }
  public get formId(): string | null { return this.props.formId; }
  public get formVersion(): number | null { return this.props.formVersion; }
  public get formSchemaSnapshotJson(): string | null { return this.props.formSchemaSnapshotJson; }
  public get answers(): RegistrationAnswers { return Registration.copyAnswers(this.props.answers); }
  public get reservationExpiresAt(): Date | null {
    return this.props.reservationExpiresAt ? new Date(this.props.reservationExpiresAt.getTime()) : null;
  }
  public get confirmationMethod(): RegistrationConfirmationMethod | null { return this.props.confirmationMethod; }
  public get confirmedAt(): Date | null { return this.props.confirmedAt ? new Date(this.props.confirmedAt.getTime()) : null; }
  public get paymentAttemptIds(): string[] { return [...this.props.paymentAttemptIds]; }
  public get cancellation(): RegistrationCancellation | null {
    return this.props.cancellation ? { ...this.props.cancellation, cancelledAt: new Date(this.props.cancellation.cancelledAt.getTime()) } : null;
  }
  public get manualConfirmation(): ManualConfirmation | null {
    return this.props.manualConfirmation ? { ...this.props.manualConfirmation, confirmedAt: new Date(this.props.manualConfirmation.confirmedAt.getTime()) } : null;
  }

  public get requiresPayment(): boolean {
    return this.props.eventKind === 'PAGO' && this.props.pricing.finalAmountInMinorUnits > 0;
  }

  public occupiesSeat(params: CurrentTimeParams): boolean {
    if (this.props.status === 'CONFIRMADA') return true;
    const holdsASeat = this.props.status === 'PENDENTE' || this.props.status === 'AGUARDANDO_PAGAMENTO';
    return holdsASeat && Boolean(this.props.reservationExpiresAt)
      && (this.props.reservationExpiresAt?.getTime() ?? 0) > params.now.getTime();
  }

  public startPayment(params: StartPaymentWithAttemptParams): Result<void, InvalidStateError | ValidationError> {
    if (!params.paymentId.trim()) {
      return Result.fail(new ValidationError({ code: 'PAYMENT_ID_REQUIRED', message: 'A tentativa de pagamento deve possuir identificador.' }));
    }
    if (this.props.status === 'AGUARDANDO_PAGAMENTO' && this.props.paymentAttemptIds.includes(params.paymentId)) return Result.ok();
    if (!this.requiresPayment || this.props.status !== 'PENDENTE') {
      return Result.fail(new InvalidStateError({ code: 'REGISTRATION_NOT_PAYABLE', message: 'A inscrição não está disponível para pagamento.' }));
    }
    if (params.reservationDurationMinutes !== null
      && (!Number.isSafeInteger(params.reservationDurationMinutes) || params.reservationDurationMinutes <= 0)) {
      return Result.fail(new ValidationError({ code: 'RESERVATION_DURATION_INVALID', message: 'O prazo de reserva deve ser positivo.' }));
    }
    this.props.status = 'AGUARDANDO_PAGAMENTO';
    this.props.reservationExpiresAt = params.reservationDurationMinutes === null
      ? null
      : new Date(params.now.getTime() + params.reservationDurationMinutes * 60_000);
    this.props.paymentAttemptIds.push(params.paymentId);
    this.touch({ at: params.now });
    return Result.ok();
  }

  public addPaymentAttempt(params: PaymentAttemptParams): Result<void, ValidationError> {
    if (!params.paymentId.trim()) {
      return Result.fail(new ValidationError({ code: 'PAYMENT_ID_REQUIRED', message: 'A tentativa de pagamento deve possuir identificador.' }));
    }
    if (!this.props.paymentAttemptIds.includes(params.paymentId)) {
      this.props.paymentAttemptIds.push(params.paymentId);
      this.touch({ at: params.now });
    }
    return Result.ok();
  }

  public returnToPending(params: CurrentTimeParams): Result<void, InvalidStateError> {
    if (this.props.status !== 'AGUARDANDO_PAGAMENTO') {
      return Result.fail(new InvalidStateError({ code: 'REGISTRATION_NOT_WAITING_FOR_PAYMENT', message: 'A inscrição não está aguardando pagamento.' }));
    }
    this.props.status = 'PENDENTE';
    this.props.reservationExpiresAt = null;
    this.touch({ at: params.now });
    return Result.ok();
  }

  public expireReservation(params: CurrentTimeParams): Result<boolean, InvalidStateError> {
    if (this.props.status !== 'PENDENTE' && this.props.status !== 'AGUARDANDO_PAGAMENTO') {
      return Result.ok(false);
    }
    const expiry = this.props.reservationExpiresAt;
    if (!expiry || expiry.getTime() > params.now.getTime()) return Result.ok(false);
    this.props.reservationExpiresAt = null;
    if (this.props.status === 'AGUARDANDO_PAGAMENTO') this.props.status = 'PENDENTE';
    this.touch({ at: params.now });
    return Result.ok(true);
  }

  public confirmPaidPayment(params: ConfirmPaidRegistrationParams): Result<boolean, InvalidStateError | ValidationError> {
    if (!this.props.paymentAttemptIds.includes(params.paymentId)) {
      return Result.fail(new ValidationError({ code: 'PAYMENT_NOT_LINKED_TO_REGISTRATION', message: 'O pagamento não está vinculado a esta inscrição.' }));
    }
    if (this.props.status === 'CONFIRMADA') return Result.ok(false);
    if (!this.requiresPayment || (this.props.status !== 'PENDENTE' && this.props.status !== 'AGUARDANDO_PAGAMENTO')) {
      return Result.fail(new InvalidStateError({ code: 'REGISTRATION_CANNOT_BE_CONFIRMED', message: 'A inscrição não pode ser confirmada por pagamento no estado atual.' }));
    }
    this.props.status = 'CONFIRMADA';
    this.props.confirmationMethod = 'PAGAMENTO';
    this.props.confirmedAt = new Date(params.now.getTime());
    this.props.reservationExpiresAt = null;
    this.touch({ at: params.now });
    return Result.ok(true);
  }

  public confirmAdministratively(params: ConfirmRegistrationAdministrativelyParams): Result<void, ValidationError | InvalidStateError> {
    if (!params.actorId.trim() || !params.reason.trim()) {
      return Result.fail(new ValidationError({ code: 'MANUAL_CONFIRMATION_AUDIT_REQUIRED', message: 'Informe o responsável e o motivo da confirmação manual.' }));
    }
    if (this.props.status !== 'PENDENTE' && this.props.status !== 'AGUARDANDO_PAGAMENTO') {
      return Result.fail(new InvalidStateError({ code: 'REGISTRATION_CANNOT_BE_CONFIRMED', message: 'A inscrição não pode ser confirmada manualmente no estado atual.' }));
    }
    this.props.status = 'CONFIRMADA';
    this.props.confirmationMethod = 'MANUAL';
    this.props.confirmedAt = new Date(params.now.getTime());
    this.props.reservationExpiresAt = null;
    this.props.manualConfirmation = {
      actorId: params.actorId,
      reason: params.reason.trim(),
      confirmedAt: new Date(params.now.getTime()),
    };
    this.touch({ at: params.now });
    return Result.ok();
  }

  public queueForWaitlist(params: CurrentTimeParams): Result<void, InvalidStateError> {
    if (this.props.status === 'CANCELADA') {
      return Result.fail(new InvalidStateError({ code: 'CANCELLED_REGISTRATION_CANNOT_WAITLIST', message: 'Uma inscrição cancelada não pode entrar na lista de espera.' }));
    }
    this.props.status = 'LISTA_ESPERA';
    this.props.reservationExpiresAt = null;
    this.props.confirmationMethod = null;
    this.props.confirmedAt = null;
    this.touch({ at: params.now });
    return Result.ok();
  }

  public promoteFromWaitlist(params: CurrentTimeParams): Result<void, InvalidStateError> {
    if (this.props.status !== 'LISTA_ESPERA') {
      return Result.fail(new InvalidStateError({ code: 'REGISTRATION_NOT_WAITLISTED', message: 'A inscrição não está na lista de espera.' }));
    }
    const hasNoCharge = this.props.eventKind === 'GRATUITO' || this.props.pricing.finalAmountInMinorUnits === 0;
    this.props.status = hasNoCharge ? 'CONFIRMADA' : 'PENDENTE';
    this.props.confirmationMethod = hasNoCharge ? Registration.initialConfirmationMethodFromProps(this.props) : null;
    this.props.confirmedAt = hasNoCharge ? new Date(params.now.getTime()) : null;
    this.touch({ at: params.now });
    return Result.ok();
  }

  public cancel(params: CancelRegistrationParams): Result<void, ValidationError | ConflictError> {
    if (!params.actorId.trim() || !params.reason.trim()) {
      return Result.fail(new ValidationError({ code: 'REGISTRATION_CANCELLATION_AUDIT_REQUIRED', message: 'Informe o responsável e o motivo do cancelamento da inscrição.' }));
    }
    if (this.props.status === 'CANCELADA') {
      return Result.fail(new ConflictError({ code: 'REGISTRATION_ALREADY_CANCELLED', message: 'A inscrição já está cancelada.' }));
    }
    this.props.status = 'CANCELADA';
    this.props.reservationExpiresAt = null;
    this.props.cancellation = {
      actorId: params.actorId,
      reason: params.reason.trim(),
      cancelledAt: new Date(params.now.getTime()),
    };
    this.touch({ at: params.now });
    return Result.ok();
  }

  public snapshot(): RegistrationSnapshot {
    return {
      id: this.id.toString(),
      code: this.props.code,
      eventId: this.props.eventId,
      participantId: this.props.participantId,
      eventKind: this.props.eventKind,
      ticketBatchId: this.props.ticketBatchId,
      pricing: this.props.pricing.snapshot(),
      status: this.props.status,
      formId: this.props.formId,
      formVersion: this.props.formVersion,
      formSchemaSnapshotJson: this.props.formSchemaSnapshotJson,
      answers: this.answers,
      reservationExpiresAt: this.reservationExpiresAt,
      confirmationMethod: this.props.confirmationMethod,
      confirmedAt: this.confirmedAt,
      paymentAttemptIds: this.paymentAttemptIds,
      cancellation: this.cancellation,
      manualConfirmation: this.manualConfirmation,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private static validate(params: CreateRegistrationParams): ValidationError | null {
    if (!params.code.trim() || !params.eventId.trim() || !params.participantId.trim()) {
      return new ValidationError({ code: 'REGISTRATION_REQUIRED_FIELDS', message: 'Código, evento e participante são obrigatórios.' });
    }
    const hasForm = params.formId !== null && params.formVersion !== null && params.formSchemaSnapshotJson !== null;
    const partialForm = params.formId === null !== (params.formVersion === null)
      || params.formId === null !== (params.formSchemaSnapshotJson === null);
    if (partialForm || (hasForm && (params.formVersion === null || params.formVersion < 1 || !params.formSchemaSnapshotJson?.trim()))) {
      return new ValidationError({ code: 'REGISTRATION_FORM_SNAPSHOT_INVALID', message: 'A versão e o histórico do formulário devem ser armazenados juntos.' });
    }
    if (params.eventKind === 'GRATUITO'
      && (params.pricing.baseAmountInMinorUnits !== 0 || params.pricing.discountAmountInMinorUnits !== 0)) {
      return new ValidationError({ code: 'FREE_REGISTRATION_PRICE_INVALID', message: 'Inscrições gratuitas não podem possuir cobrança ou desconto.' });
    }
    if (params.isWaitlisted && params.reservationExpiresAt !== null) {
      return new ValidationError({ code: 'WAITLIST_CANNOT_RESERVE_SEAT', message: 'Uma inscrição em lista de espera não pode reservar vaga.' });
    }
    if (params.reservationExpiresAt && params.reservationExpiresAt.getTime() <= params.now.getTime()) {
      return new ValidationError({ code: 'SEAT_RESERVATION_EXPIRY_INVALID', message: 'A reserva de vaga deve expirar no futuro.' });
    }
    return null;
  }

  private static initialConfirmationMethod(params: CreateRegistrationParams): RegistrationConfirmationMethod {
    if (params.eventKind === 'GRATUITO') return 'GRATUITA';
    return params.pricing.couponType === 'CORTESIA' ? 'CORTESIA' : 'ISENCAO';
  }

  private static initialConfirmationMethodFromProps(props: RegistrationProps): RegistrationConfirmationMethod {
    if (props.eventKind === 'GRATUITO') return 'GRATUITA';
    return props.pricing.couponType === 'CORTESIA' ? 'CORTESIA' : 'ISENCAO';
  }

  private static copyAnswers(answers: RegistrationAnswers): RegistrationAnswers {
    const copy: RegistrationAnswers = {};
    for (const [fieldId, answer] of Object.entries(answers)) {
      if (Array.isArray(answer)) copy[fieldId] = [...answer];
      else if (answer && typeof answer === 'object') copy[fieldId] = { ...answer };
      else copy[fieldId] = answer;
    }
    return copy;
  }
}
