import { AggregateRoot } from '@core/domain/aggregate-root.base';
import type { EntityConstructorParams } from '@core/domain/entity.base';
import { Result } from '@core/domain/result';
import { MoneyVO } from '@core/domain/value-objects/money.vo';
import { CheckInNotAllowedError } from '../errors/check-in-not-allowed.error';
import { InvalidRegistrationStatusTransitionError } from '../errors/invalid-registration-status-transition.error';
import { CheckIn } from './check-in.entity';
import { FormAnswer } from '../value-objects/form-answer.vo';
import { RegistrationCode } from '../value-objects/registration-code.vo';
import { RegistrationStatus } from '../value-objects/registration-status.vo';
import type { RegistrationStatusValue } from '../value-objects/registration-status.vo';
import { Reservation } from '../value-objects/reservation.vo';
import { SeatStatus } from '../value-objects/seat-status.vo';
import type { SeatStatusValue } from '../value-objects/seat-status.vo';

export type RegistrationProps = {
  code: RegistrationCode;
  eventId: string;
  participantId: string;
  loteId: string | null;
  loteName: string | null;
  status: RegistrationStatus;
  seatStatus: SeatStatus;
  price: MoneyVO;
  discount: MoneyVO;
  finalAmount: MoneyVO;
  couponId: string | null;
  couponCode: string | null;
  isCourtesy: boolean;
  courtesyReason: string | null;
  paymentMethod: string | null;
  waitlistPosition: number | null;
  reservation: Reservation;
  formVersion: number;
  answers: FormAnswer[];
  checkIn: CheckIn | null;
  notes: string | null;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  createdBy: string | null;
};
export type RegistrationConstructorParams = EntityConstructorParams<RegistrationProps>;
export type ReconstituteRegistrationParams = RegistrationConstructorParams & {
  id: NonNullable<RegistrationConstructorParams['id']>;
};
export type CreateRegistrationParams = {
  eventId: string;
  participantId: string;
  loteId?: string | null;
  loteName?: string | null;
  priceCents: number;
  discountCents?: number;
  couponId?: string | null;
  couponCode?: string | null;
  isCourtesy?: boolean;
  courtesyReason?: string | null;
  answers: FormAnswer[];
  formVersion: number;
  waitlistPosition?: number | null;
  reservationExpiresAt?: Date | null;
  createdBy?: string | null;
  code?: string;
};
export type CancelRegistrationParams = {
  at: Date;
  reason: string;
  cancelledBy?: string | null;
  isAdministrative?: boolean;
};
export type ConfirmRegistrationParams = { at: Date; paymentMethod?: string | null };
export type RegisterCheckInParams = {
  at: Date;
  checkedInBy?: string | null;
  operatorName?: string | null;
  method: 'QR_CODE' | 'MANUAL';
  isOverride?: boolean;
  overrideReason?: string | null;
};

/**
 * Inscrição — Aggregate Root que garante as invariantes de vaga, situação e
 * histórico (§3, §4, §7, §26, §27 e §29).
 */
export class Registration extends AggregateRoot<RegistrationProps> {
  private constructor(params: RegistrationConstructorParams) {
    super(params);
  }

  get code(): RegistrationCode { return this.props.code; }
  get eventId(): string { return this.props.eventId; }
  get participantId(): string { return this.props.participantId; }
  get loteId(): string | null { return this.props.loteId; }
  get loteName(): string | null { return this.props.loteName; }
  get status(): RegistrationStatus { return this.props.status; }
  get seatStatus(): SeatStatus { return this.props.seatStatus; }
  get price(): MoneyVO { return this.props.price; }
  get discount(): MoneyVO { return this.props.discount; }
  get finalAmount(): MoneyVO { return this.props.finalAmount; }
  get couponId(): string | null { return this.props.couponId; }
  get couponCode(): string | null { return this.props.couponCode; }
  get isCourtesy(): boolean { return this.props.isCourtesy; }
  get courtesyReason(): string | null { return this.props.courtesyReason; }
  get paymentMethod(): string | null { return this.props.paymentMethod; }
  get waitlistPosition(): number | null { return this.props.waitlistPosition; }
  get reservation(): Reservation { return this.props.reservation; }
  get formVersion(): number { return this.props.formVersion; }
  get answers(): FormAnswer[] { return [...this.props.answers]; }
  get checkIn(): CheckIn | null { return this.props.checkIn; }
  get notes(): string | null { return this.props.notes; }
  get confirmedAt(): Date | null { return this.props.confirmedAt; }
  get cancelledAt(): Date | null { return this.props.cancelledAt; }
  get cancelledBy(): string | null { return this.props.cancelledBy; }
  get cancelReason(): string | null { return this.props.cancelReason; }
  get createdBy(): string | null { return this.props.createdBy; }

  /**
   * Cria a inscrição. Inscrições de eventos gratuitos já nascem confirmadas
   * quando não há lista de espera; pagas ficam aguardando o pagamento (§10 e §11).
   */
  public static create(params: CreateRegistrationParams): Result<Registration> {
    if (!params.eventId) return Result.fail(new Error('Inscrição deve estar vinculada a um evento'));
    if (!params.participantId) return Result.fail(new Error('Inscrição deve estar vinculada a um participante'));
    if (params.priceCents < 0) return Result.fail(new Error('Valor da inscrição não pode ser negativo'));
    if (params.discountCents !== undefined && params.discountCents < 0) {
      return Result.fail(new Error('Desconto da inscrição não pode ser negativo'));
    }
    if (params.discountCents !== undefined && params.discountCents > params.priceCents) {
      return Result.fail(new Error('Desconto não pode ser maior que o valor da inscrição'));
    }
    if (params.isCourtesy && !params.courtesyReason) {
      return Result.fail(new Error('Cortesia exige justificativa registrada'));
    }
    const priceResult = MoneyVO.create({ cents: params.priceCents });
    if (priceResult.isFailure) return Result.fail(priceResult.error);

    const discountResult = MoneyVO.create({ cents: params.discountCents ?? 0 });
    if (discountResult.isFailure) return Result.fail(discountResult.error);

    const price = priceResult.value;
    const discount = params.isCourtesy ? price : discountResult.value;
    const finalAmount = price.subtractClampedToZero(discount);

    const inWaitlist = (params.waitlistPosition ?? null) !== null;
    const isFree = finalAmount.isZero();

    const registration = new Registration({
      props: {
        code: params.code ? RegistrationCode.reconstitute(params.code) : RegistrationCode.generate(),
        eventId: params.eventId,
        participantId: params.participantId,
        loteId: params.loteId ?? null,
        loteName: params.loteName ?? null,
        status: RegistrationStatus.reconstitute(inWaitlist ? 'LISTA_ESPERA' : isFree ? 'CONFIRMADA' : 'PENDENTE'),
        seatStatus: SeatStatus.reconstitute(
          inWaitlist ? 'LIBERADA' : isFree ? 'OCUPADA' : 'RESERVADA',
        ),
        price,
        discount,
        finalAmount,
        couponId: params.couponId ?? null,
        couponCode: params.couponCode ?? null,
        isCourtesy: params.isCourtesy ?? false,
        courtesyReason: params.courtesyReason ?? null,
        paymentMethod: isFree ? 'CORTESIA' : null,
        waitlistPosition: params.waitlistPosition ?? null,
        reservation: params.reservationExpiresAt
          ? Reservation.reconstitute(params.reservationExpiresAt)
          : Reservation.none(),
        formVersion: params.formVersion,
        answers: params.answers,
        checkIn: null,
        notes: null,
        confirmedAt: !inWaitlist && isFree ? new Date() : null,
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: null,
        createdBy: params.createdBy ?? null,
      },
    });

    return Result.ok(registration);
  }

  public static reconstitute(params: ReconstituteRegistrationParams): Registration {
    return new Registration(params);
  }

  /** Inscrição paga passa a aguardar pagamento após a escolha da forma (§11). */
  public markAwaitingPayment(params: { paymentMethod: string; reservationExpiresAt?: Date | null }): Result<void> {
    if (this.props.status.value !== 'PENDENTE') {
      return Result.fail(new InvalidRegistrationStatusTransitionError(this.props.status.value, 'AGUARDANDO_PAGAMENTO'));
    }
    if (!['PIX', 'BOLETO', 'CREDIT_CARD'].includes(params.paymentMethod)) {
      return Result.fail(new Error('Forma de pagamento inválida para inscrição'));
    }

    this.props.status = RegistrationStatus.reconstitute('AGUARDANDO_PAGAMENTO');
    this.props.paymentMethod = params.paymentMethod;
    this.props.seatStatus = SeatStatus.reconstitute('RESERVADA');
    if (params.reservationExpiresAt !== undefined) {
      this.props.reservation = Reservation.reconstitute(params.reservationExpiresAt);
    }
    this.touch();
    return Result.ok();
  }

  /**
   * Confirma a inscrição. Só ocorre com pagamento válido, cortesia ou ação
   * administrativa autorizada (§7, §19 e §24).
   */
  public confirm(params: ConfirmRegistrationParams): Result<void> {
    if (this.props.status.isConfirmed()) return Result.ok();
    if (this.props.status.isCancelled()) {
      return Result.fail(new InvalidRegistrationStatusTransitionError(this.props.status.value, 'CONFIRMADA'));
    }

    this.props.status = RegistrationStatus.reconstitute('CONFIRMADA');
    this.props.seatStatus = SeatStatus.reconstitute('OCUPADA');
    this.props.reservation = Reservation.none();
    this.props.confirmedAt = params.at;
    this.props.waitlistPosition = null;
    if (params.paymentMethod) this.props.paymentMethod = params.paymentMethod;
    if (this.props.finalAmount.isZero() && !this.props.paymentMethod) {
      this.props.paymentMethod = 'CORTESIA';
    }
    this.touch();
    return Result.ok();
  }

  /** Move a inscrição para o fim da lista de espera (§26). */
  public moveToWaitlist(position: number): Result<void> {
    if (this.props.status.isConfirmed()) {
      return Result.fail(new InvalidRegistrationStatusTransitionError(this.props.status.value, 'LISTA_ESPERA'));
    }
    if (!Number.isInteger(position) || position <= 0) {
      return Result.fail(new Error('Posição na lista de espera inválida'));
    }
    this.props.status = RegistrationStatus.reconstitute('LISTA_ESPERA');
    this.props.seatStatus = SeatStatus.reconstitute('LIBERADA');
    this.props.waitlistPosition = position;
    this.props.reservation = Reservation.none();
    this.touch();
    return Result.ok();
  }

  /**
   * Promove a inscrição da lista de espera. Em evento pago a promoção apenas
   * libera a vaga reservada — a confirmação continua dependendo do pagamento.
   */
  public promoteFromWaitlist(params: { at: Date; isFree: boolean; reservationExpiresAt?: Date | null }): Result<void> {
    if (!this.props.status.isWaitlisted()) {
      return Result.fail(new InvalidRegistrationStatusTransitionError(this.props.status.value, 'PENDENTE'));
    }

    this.props.waitlistPosition = null;
    if (params.isFree) {
      this.props.status = RegistrationStatus.reconstitute('CONFIRMADA');
      this.props.seatStatus = SeatStatus.reconstitute('OCUPADA');
      this.props.confirmedAt = params.at;
    } else {
      this.props.status = RegistrationStatus.reconstitute('PENDENTE');
      this.props.seatStatus = SeatStatus.reconstitute('RESERVADA');
      this.props.reservation = params.reservationExpiresAt
        ? Reservation.reconstitute(params.reservationExpiresAt)
        : Reservation.none();
    }
    this.touch();
    return Result.ok();
  }

  /** Cancela a inscrição e libera a vaga quando aplicável (§27). */
  public cancel(params: CancelRegistrationParams): Result<void> {
    if (this.props.status.isCancelled()) return Result.fail(new Error('Inscrição já está cancelada'));
    if (!params.reason || params.reason.trim().length < 5) {
      return Result.fail(new Error('Cancelamento exige um motivo com ao menos 5 caracteres'));
    }

    this.props.status = RegistrationStatus.reconstitute('CANCELADA');
    this.props.seatStatus = SeatStatus.reconstitute('LIBERADA');
    this.props.reservation = Reservation.none();
    this.props.waitlistPosition = null;
    this.props.cancelledAt = params.at;
    this.props.cancelReason = params.reason.trim();
    this.props.cancelledBy = params.cancelledBy ?? null;
    this.touch();
    return Result.ok();
  }

  /**
   * Expira a reserva temporária de vaga (§4 e §39): a vaga volta a ficar
   * disponível. O pagamento aprovado posteriormente é tratado na confirmação.
   */
  public expireReservation(params: { at: Date; reason?: string }): Result<void> {
    if (!this.props.seatStatus.isReserved()) {
      return Result.fail(new Error('Inscrição não possui reserva de vaga ativa para expirar'));
    }
    if (!this.props.reservation.isExpired(params.at)) {
      return Result.fail(new Error('Reserva de vaga ainda está vigente'));
    }

    this.props.status = RegistrationStatus.reconstitute('CANCELADA');
    this.props.seatStatus = SeatStatus.reconstitute('EXPIRADA');
    this.props.reservation = Reservation.none();
    this.props.cancelledAt = params.at;
    this.props.cancelReason = params.reason ?? 'Reserva de vaga expirada por falta de pagamento';
    this.touch();
    return Result.ok();
  }

  /** Registra o check-in, impedindo duplicidade salvo override administrativo (§29). */
  public registerCheckIn(params: RegisterCheckInParams): Result<CheckIn> {
    if (!this.props.status.allowsCheckIn()) {
      return Result.fail(new CheckInNotAllowedError('INSCRICAO_NAO_CONFIRMADA'));
    }
    if (this.props.checkIn && !params.isOverride) {
      return Result.fail(new CheckInNotAllowedError('CHECKIN_DUPLICADO'));
    }

    const checkInResult = CheckIn.create({
      registrationId: this.id.toString(),
      eventId: this.props.eventId,
      at: params.at,
      checkedInBy: params.checkedInBy ?? null,
      operatorName: params.operatorName ?? null,
      method: params.method,
      isOverride: params.isOverride ?? false,
      overrideReason: params.overrideReason ?? null,
    });
    if (checkInResult.isFailure) return Result.fail(checkInResult.error);

    this.props.checkIn = checkInResult.value;
    this.touch();
    return Result.ok(checkInResult.value);
  }

  public hasCheckedIn(): boolean {
    return this.props.checkIn !== null;
  }

  public changeReservation(expiresAt: Date): Result<void> {
    return this.props.reservation.extendTo(expiresAt);
  }

  public updateNotes(notes: string | null): void {
    this.props.notes = notes;
    this.touch();
  }

  public isPayable(): boolean {
    return !this.props.finalAmount.isZero() && !this.props.status.isCancelled() && !this.props.status.isConfirmed();
  }
}
