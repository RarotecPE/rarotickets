import { AggregateRoot } from "@/@core/domain/aggregate-root.base";
import type { EntityConstructorParams } from "@/@core/domain/entity.base";
import { Identifier } from "@/@core/domain/identifier";
import { Result } from "@/@core/domain/result";
import {
  DateRange,
  Document,
  Email,
  Money,
  Name,
  Percent,
  Phone,
} from "./value-objects";
import type {
  CancellationReason,
  CheckInStatus,
  CouponType,
  EventModality,
  EventStatus,
  FinancialType,
  PaymentMethod,
  PaymentStatus,
  RegistrationStatus,
  UserRole,
} from "./types";
import {
  CheckInAlreadyPerformedError,
  InvalidEventStatusTransitionError,
  InvalidRegistrationTransitionError,
  RegistrationNotEligibleForCheckinError,
  SoldOutError,
} from "./errors";
import { generateCertificateCode, generateCredentialToken, generateRegistrationCode } from "@/shared/utils/format";

// ===========================================================================
// EVENT
// ===========================================================================
export type EventProps = {
  title: string;
  description: string;
  modality: EventModality;
  financialType: FinancialType;
  status: EventStatus;
  dateRange: DateRange;
  capacity: number;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  streamUrl?: string | null;
  managerId: string; // RaroNexus global user id
  certificateEnabled: boolean;
  certificateHours?: number | null;
  certificateMinPresencePercent?: Percent | null;
  waitlistEnabled: boolean;
  canceledAt?: Date | null;
  cancelReason?: string | null;
  publishedAt?: Date | null;
  customFormFields: CustomFormField[];
};

export type CustomFormField = {
  id: string;
  label: string;
  type: "TEXT" | "EMAIL" | "PHONE" | "TEXTAREA" | "SELECT" | "CHECKBOX" | "FILE";
  required: boolean;
  options?: string[];
};

export type CreateEventParams = {
  title: string;
  description: string;
  modality: EventModality;
  financialType: FinancialType;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  streamUrl?: string | null;
  managerId: string;
  waitlistEnabled?: boolean;
  certificateEnabled?: boolean;
  certificateHours?: number | null;
};

export class Event extends AggregateRoot<EventProps> {
  private constructor(params: EntityConstructorParams<EventProps>) {
    super(params);
  }

  get title(): string { return this.props.title; }
  get description(): string { return this.props.description; }
  get modality(): EventModality { return this.props.modality; }
  get financialType(): FinancialType { return this.props.financialType; }
  get status(): EventStatus { return this.props.status; }
  get dateRange(): DateRange { return this.props.dateRange; }
  get capacity(): number { return this.props.capacity; }
  get address(): string | null | undefined { return this.props.address; }
  get city(): string | null | undefined { return this.props.city; }
  get state(): string | null | undefined { return this.props.state; }
  get streamUrl(): string | null | undefined { return this.props.streamUrl; }
  get managerId(): string { return this.props.managerId; }
  get certificateEnabled(): boolean { return this.props.certificateEnabled; }
  get certificateHours(): number | null | undefined { return this.props.certificateHours; }
  get waitlistEnabled(): boolean { return this.props.waitlistEnabled; }
  get customFormFields(): CustomFormField[] { return [...this.props.customFormFields]; }
  get canceledAt(): Date | null { return this.props.canceledAt ?? null; }
  get cancelReason(): string | null { return this.props.cancelReason ?? null; }
  get publishedAt(): Date | null { return this.props.publishedAt ?? null; }
  get certificateMinPresencePercent(): Percent | null { return this.props.certificateMinPresencePercent ?? null; }

  public static create(params: CreateEventParams): Result<Event> {
    const rangeResult = DateRange.create(params.startsAt, params.endsAt);
    if (rangeResult.isFailure) return Result.fail(rangeResult.error);

    if (params.capacity <= 0) {
      return Result.fail(
        new Error("Capacidade deve ser maior que zero"),
      );
    }
    if (params.modality === "PRESENCIAL") {
      if (!params.address || !params.city || !params.state) {
        return Result.fail(new Error("Eventos presenciais requerem endereço, município e UF"));
      }
    }
    if (params.modality === "ONLINE") {
      if (!params.streamUrl) {
        return Result.fail(new Error("Eventos online requerem link de transmissão"));
      }
    }

    const ev = new Event({
      props: {
        title: params.title.trim(),
        description: params.description.trim(),
        modality: params.modality,
        financialType: params.financialType,
        status: "RASCUNHO",
        dateRange: rangeResult.value,
        capacity: params.capacity,
        address: params.address ?? null,
        city: params.city ?? null,
        state: params.state ?? null,
        streamUrl: params.streamUrl ?? null,
        managerId: params.managerId,
        certificateEnabled: params.certificateEnabled ?? false,
        certificateHours: params.certificateHours ?? null,
        certificateMinPresencePercent: params.certificateEnabled
          ? Percent.reconstitute(100)
          : null,
        waitlistEnabled: params.waitlistEnabled ?? true,
        canceledAt: null,
        cancelReason: null,
        publishedAt: null,
        customFormFields: [],
      },
    });
    return Result.ok(ev);
  }

  public static reconstitute(params: EntityConstructorParams<EventProps> & { id: Identifier }): Event {
    return new Event(params);
  }

  private transitionTo(next: EventStatus): Result<void> {
    const allowed: Record<EventStatus, EventStatus[]> = {
      RASCUNHO: ["AGENDADO", "INSCRICOES_ABERTAS", "CANCELADO"],
      AGENDADO: ["INSCRICOES_ABERTAS", "CANCELADO"],
      INSCRICOES_ABERTAS: ["INSCRICOES_ENCERRADAS", "CANCELADO"],
      INSCRICOES_ENCERRADAS: ["INSCRICOES_ABERTAS", "EM_ANDAMENTO", "CANCELADO"],
      EM_ANDAMENTO: ["FINALIZADO"],
      FINALIZADO: [],
      CANCELADO: [],
    };
    if (!allowed[this.props.status].includes(next)) {
      return Result.fail(new InvalidEventStatusTransitionError(this.props.status, next));
    }
    this.props.status = next;
    if (next === "INSCRICOES_ABERTAS" && !this.props.publishedAt) {
      this.props.publishedAt = new Date();
    }
    this.touch();
    return Result.ok();
  }

  public publish(): Result<void> {
    const now = new Date();
    const shouldSchedule = now < this.props.dateRange.startsAt;
    return this.transitionTo(shouldSchedule ? "AGENDADO" : "INSCRICOES_ABERTAS");
  }

  public openRegistrations(): Result<void> { return this.transitionTo("INSCRICOES_ABERTAS"); }
  public closeRegistrations(): Result<void> { return this.transitionTo("INSCRICOES_ENCERRADAS"); }
  public reopenRegistrations(): Result<void> { return this.transitionTo("INSCRICOES_ABERTAS"); }
  public start(): Result<void> { return this.transitionTo("EM_ANDAMENTO"); }
  public finish(): Result<void> { return this.transitionTo("FINALIZADO"); }

  public cancel(params: { reason: string }): Result<void> {
    const r = this.transitionTo("CANCELADO");
    if (r.isFailure) return r;
    this.props.canceledAt = new Date();
    this.props.cancelReason = params.reason;
    this.touch();
    return Result.ok();
  }

  /** Aplica transições automáticas baseadas no relógio. */
  public autoEvaluateByTime(now: Date): void {
    if (this.props.status === "AGENDADO" && now >= this.props.dateRange.startsAt) {
      this.props.status = "INSCRICOES_ABERTAS";
      this.touch();
    }
    if (
      this.props.status === "INSCRICOES_ABERTAS" &&
      now > this.props.dateRange.endsAt
    ) {
      this.props.status = "INSCRICOES_ENCERRADAS";
      this.touch();
    }
    if (
      this.props.status === "INSCRICOES_ENCERRADAS" &&
      now >= this.props.dateRange.startsAt
    ) {
      this.props.status = "EM_ANDAMENTO";
      this.touch();
    }
    if (this.props.status === "EM_ANDAMENTO" && now >= this.props.dateRange.endsAt) {
      this.props.status = "FINALIZADO";
      this.touch();
    }
  }

  public setCustomFormFields(fields: CustomFormField[]): void {
    this.props.customFormFields = fields;
    this.touch();
  }
}

// ===========================================================================
// LOT
// ===========================================================================
export type LotProps = {
  eventId: string;
  name: string;
  price: Money;
  dateRange: DateRange;
  totalSpots: number;
  spotsTaken: number;
  active: boolean;
};

export type CreateLotParams = {
  eventId: string;
  name: string;
  priceCents: number;
  startsAt: Date;
  endsAt: Date;
  totalSpots: number;
};

export class Lot extends AggregateRoot<LotProps> {
  private constructor(params: EntityConstructorParams<LotProps>) { super(params); }

  get eventId(): string { return this.props.eventId; }
  get name(): string { return this.props.name; }
  get price(): Money { return this.props.price; }
  get dateRange(): DateRange { return this.props.dateRange; }
  get totalSpots(): number { return this.props.totalSpots; }
  get spotsTaken(): number { return this.props.spotsTaken; }
  get active(): boolean { return this.props.active; }
  get spotsRemaining(): number { return Math.max(0, this.props.totalSpots - this.props.spotsTaken); }

  public static create(params: CreateLotParams): Result<Lot> {
    if (!params.name?.trim()) return Result.fail(new Error("Nome do lote obrigatório"));
    if (params.totalSpots <= 0) return Result.fail(new Error("Vagas do lote devem ser > 0"));
    const price = params.priceCents > 0
      ? Money.create(params.priceCents)
      : Result.ok(Money.zero());
    if (price.isFailure) return Result.fail(price.error);
    const range = DateRange.create(params.startsAt, params.endsAt);
    if (range.isFailure) return Result.fail(range.error);
    return Result.ok(new Lot({
      props: {
        eventId: params.eventId,
        name: params.name.trim(),
        price: price.value,
        dateRange: range.value,
        totalSpots: params.totalSpots,
        spotsTaken: 0,
        active: true,
      },
    }));
  }

  public static reconstitute(params: EntityConstructorParams<LotProps> & { id: Identifier }): Lot {
    return new Lot(params);
  }

  public isAvailableNow(now: Date): boolean {
    return this.props.active && this.props.dateRange.contains(now) && this.spotsRemaining > 0;
  }

  public reserveSpot(): Result<void> {
    if (this.spotsRemaining <= 0) return Result.fail(new SoldOutError());
    this.props.spotsTaken += 1;
    this.touch();
    return Result.ok();
  }

  public releaseSpot(): void {
    if (this.props.spotsTaken > 0) {
      this.props.spotsTaken -= 1;
      this.touch();
    }
  }

  public activate(): void { this.props.active = true; this.touch(); }
  public deactivate(): void { this.props.active = false; this.touch(); }
}

// ===========================================================================
// PARTICIPANT
// ===========================================================================
export type ParticipantProps = {
  name: Name;
  email: Email;
  document: Document;
  phone?: Phone | null;
  company?: string | null;
  role?: string | null;
};

export type CreateParticipantParams = {
  name: string;
  email: string;
  documentKind: "CPF" | "PASSAPORTE";
  document: string;
  phone?: string | null;
  company?: string | null;
  role?: string | null;
};

export class Participant extends AggregateRoot<ParticipantProps> {
  private constructor(params: EntityConstructorParams<ParticipantProps>) { super(params); }

  get name(): Name { return this.props.name; }
  get email(): Email { return this.props.email; }
  get document(): Document { return this.props.document; }
  get phone(): Phone | null { return this.props.phone ?? null; }
  get company(): string | null { return this.props.company ?? null; }
  get role(): string | null { return this.props.role ?? null; }

  public static create(params: CreateParticipantParams): Result<Participant> {
    const name = Name.create(params.name);
    if (name.isFailure) return Result.fail(name.error);
    const email = Email.create(params.email);
    if (email.isFailure) return Result.fail(email.error);
    const doc = Document.create(params.documentKind, params.document);
    if (doc.isFailure) return Result.fail(doc.error);
    let phone: Phone | null = null;
    if (params.phone) {
      const p = Phone.create(params.phone);
      if (p.isFailure) return Result.fail(p.error);
      phone = p.value;
    }
    return Result.ok(new Participant({
      props: {
        name: name.value,
        email: email.value,
        document: doc.value,
        phone,
        company: params.company?.trim() || null,
        role: params.role?.trim() || null,
      },
    }));
  }

  public static reconstitute(params: EntityConstructorParams<ParticipantProps> & { id: Identifier }): Participant {
    return new Participant(params);
  }

  public updateProfile(params: Partial<CreateParticipantParams>): Result<void> {
    if (params.name) {
      const n = Name.create(params.name);
      if (n.isFailure) return Result.fail(n.error);
      this.props.name = n.value;
    }
    if (params.phone) {
      const p = Phone.create(params.phone);
      if (p.isFailure) return Result.fail(p.error);
      this.props.phone = p.value;
    }
    if (params.company !== undefined) this.props.company = params.company?.trim() || null;
    if (params.role !== undefined) this.props.role = params.role?.trim() || null;
    this.touch();
    return Result.ok();
  }
}

// ===========================================================================
// REGISTRATION
// ===========================================================================
export type FormAnswer = { fieldId: string; label: string; value: string };

export type RegistrationProps = {
  code: string;
  eventId: string;
  participantId: string;
  lotId?: string | null;
  status: RegistrationStatus;
  contractedPrice: Money; // snapshot imutável
  discountAmount: Money;
  finalPrice: Money;
  couponId?: string | null;
  answers: FormAnswer[];
  consentTerms: boolean;
  consentMarketing: boolean;
  reservationExpiresAt?: Date | null;
  waitlistPosition?: number | null;
  cancellationReason?: CancellationReason | null;
  canceledAt?: Date | null;
  confirmedAt?: Date | null;
  credentialToken?: string | null;
  credentialQrPayload?: string | null;
};

export type CreateRegistrationParams = {
  eventId: string;
  participantId: string;
  lotId?: string | null;
  lotPrice?: Money;
  answers: FormAnswer[];
  consentTerms: boolean;
  consentMarketing: boolean;
  discount?: Money;
  couponId?: string | null;
  isFree?: boolean;
};

export class Registration extends AggregateRoot<RegistrationProps> {
  private constructor(params: EntityConstructorParams<RegistrationProps>) { super(params); }

  get code(): string { return this.props.code; }
  get eventId(): string { return this.props.eventId; }
  get participantId(): string { return this.props.participantId; }
  get lotId(): string | null { return this.props.lotId ?? null; }
  get status(): RegistrationStatus { return this.props.status; }
  get contractedPrice(): Money { return this.props.contractedPrice; }
  get finalPrice(): Money { return this.props.finalPrice; }
  get discountAmount(): Money { return this.props.discountAmount; }
  get reservationExpiresAt(): Date | null { return this.props.reservationExpiresAt ?? null; }
  get waitlistPosition(): number | null { return this.props.waitlistPosition ?? null; }
  get answers(): FormAnswer[] { return [...this.props.answers]; }
  get confirmedAt(): Date | null { return this.props.confirmedAt ?? null; }
  get canceledAt(): Date | null { return this.props.canceledAt ?? null; }
  get credentialToken(): string | null { return this.props.credentialToken ?? null; }
  get credentialQrPayload(): string | null { return this.props.credentialQrPayload ?? null; }
  get couponId(): string | null { return this.props.couponId ?? null; }
  get consentMarketing(): boolean { return this.props.consentMarketing; }
  get consentTerms(): boolean { return this.props.consentTerms; }
  get cancellationReason(): CancellationReason | null { return this.props.cancellationReason ?? null; }

  public static create(params: CreateRegistrationParams): Result<Registration> {
    if (!params.consentTerms) {
      return Result.fail(new Error("Aceite aos termos é obrigatório"));
    }
    const basePrice = params.lotPrice ?? Money.zero();
    const discount = params.discount ?? Money.zero();
    const finalPrice = basePrice.subtractOrZero(discount);
    const isFree = params.isFree || finalPrice.isZero();

    const reg = new Registration({
      props: {
        code: generateRegistrationCode(),
        eventId: params.eventId,
        participantId: params.participantId,
        lotId: params.lotId ?? null,
        status: isFree ? "CONFIRMADA" : "PENDENTE",
        contractedPrice: basePrice,
        discountAmount: discount,
        finalPrice,
        couponId: params.couponId ?? null,
        answers: params.answers,
        consentTerms: true,
        consentMarketing: params.consentMarketing,
        reservationExpiresAt: null,
        waitlistPosition: null,
        cancellationReason: null,
        canceledAt: null,
        confirmedAt: isFree ? new Date() : null,
        credentialToken: null,
        credentialQrPayload: null,
      },
    });
    if (isFree) {
      reg.issueCredential();
    }
    return Result.ok(reg);
  }

  public static reconstitute(params: EntityConstructorParams<RegistrationProps> & { id: Identifier }): Registration {
    return new Registration(params);
  }

  private transitionTo(next: RegistrationStatus): Result<void> {
    const allowed: Record<RegistrationStatus, RegistrationStatus[]> = {
      PENDENTE: ["AGUARDANDO_PAGAMENTO", "CANCELADA", "CONFIRMADA", "LISTA_ESPERA"],
      AGUARDANDO_PAGAMENTO: ["CONFIRMADA", "CANCELADA"],
      CONFIRMADA: ["CANCELADA"],
      CANCELADA: [],
      LISTA_ESPERA: ["PENDENTE"],
    };
    if (!allowed[this.props.status].includes(next)) {
      return Result.fail(new InvalidRegistrationTransitionError(this.props.status, next));
    }
    this.props.status = next;
    this.touch();
    return Result.ok();
  }

  public openCheckout(): Result<void> {
    const r = this.transitionTo("AGUARDANDO_PAGAMENTO");
    if (r.isFailure) return r;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    this.props.reservationExpiresAt = expiresAt;
    return Result.ok();
  }

  public markPaid(): Result<void> {
    const r = this.transitionTo("CONFIRMADA");
    if (r.isFailure) return r;
    this.props.confirmedAt = new Date();
    this.props.reservationExpiresAt = null;
    this.issueCredential();
    return Result.ok();
  }

  public cancel(reason: CancellationReason): Result<void> {
    // Permite cancelar de qualquer status não-terminal para liberar vaga.
    if (this.props.status === "CANCELADA") return Result.ok();
    this.props.status = "CANCELADA";
    this.props.cancellationReason = reason;
    this.props.canceledAt = new Date();
    this.props.reservationExpiresAt = null;
    this.touch();
    return Result.ok();
  }

  public sendToWaitlist(position: number): Result<void> {
    const r = this.transitionTo("LISTA_ESPERA");
    if (r.isFailure) return r;
    this.props.waitlistPosition = position;
    this.props.reservationExpiresAt = null;
    return Result.ok();
  }

  public promoteFromWaitlist(lotId: string, lotPrice: Money): Result<void> {
    const r = this.transitionTo("PENDENTE");
    if (r.isFailure) return r;
    this.props.lotId = lotId;
    this.props.contractedPrice = lotPrice;
    this.props.finalPrice = lotPrice.subtractOrZero(this.props.discountAmount);
    this.props.waitlistPosition = null;
    return Result.ok();
  }

  public expireReservationIfDue(now: Date): boolean {
    if (
      this.props.status === "PENDENTE" ||
      this.props.status === "AGUARDANDO_PAGAMENTO"
    ) {
      if (this.props.reservationExpiresAt && now > this.props.reservationExpiresAt) {
        this.props.status = "CANCELADA";
        this.props.cancellationReason = "TIMEOUT_RESERVA";
        this.props.canceledAt = now;
        this.props.reservationExpiresAt = null;
        this.touch();
        return true;
      }
    }
    return false;
  }

  private issueCredential(): void {
    const token = generateCredentialToken();
    this.props.credentialToken = token;
    this.props.credentialQrPayload = `RAROTICKETS:${this.props.code}:${token}`;
  }
}

// ===========================================================================
// COUPON
// ===========================================================================
export type CouponProps = {
  code: string;
  type: CouponType;
  value: number; // percentual ou centavos
  eventId?: string | null; // null = global
  maxUses?: number | null;
  uses: number;
  active: boolean;
  validUntil?: Date | null;
};

export class Coupon extends AggregateRoot<CouponProps> {
  private constructor(params: EntityConstructorParams<CouponProps>) { super(params); }

  get code(): string { return this.props.code; }
  get type(): CouponType { return this.props.type; }
  get value(): number { return this.props.value; }
  get eventId(): string | null { return this.props.eventId ?? null; }
  get maxUses(): number | null { return this.props.maxUses ?? null; }
  get uses(): number { return this.props.uses; }
  get active(): boolean { return this.props.active; }
  get validUntil(): Date | null { return this.props.validUntil ?? null; }
  getProps(): CouponProps { return { ...this.props }; }

  public static create(params: Omit<CouponProps, "uses" | "active">): Result<Coupon> {
    if (!params.code?.trim()) return Result.fail(new Error("Código do cupom obrigatório"));
    return Result.ok(new Coupon({
      props: {
        code: params.code.trim().toUpperCase(),
        type: params.type,
        value: params.value,
        eventId: params.eventId ?? null,
        maxUses: params.maxUses ?? null,
        uses: 0,
        active: true,
        validUntil: params.validUntil ?? null,
      },
    }));
  }

  public static reconstitute(params: EntityConstructorParams<CouponProps> & { id: Identifier }): Coupon {
    return new Coupon(params);
  }

  public calculateDiscount(basePrice: Money): Result<Money> {
    if (!this.active) return Result.fail(new Error("Cupom inativo"));
    if (this.validUntil && new Date() > this.validUntil) {
      return Result.fail(new Error("Cupom expirado"));
    }
    if (this.maxUses !== null && this.uses >= (this.maxUses ?? 0)) {
      return Result.fail(new Error("Cupom esgotado"));
    }
    if (this.type === "CORTESIA") return Result.ok(basePrice);
    if (this.type === "VALOR_FIXO") {
      const m = Money.create(Math.min(this.value, basePrice.cents));
      if (m.isFailure) return Result.fail(m.error);
      return Result.ok(m.value);
    }
    const p = Percent.create(this.value);
    if (p.isFailure) return Result.fail(p.error);
    return Result.ok(basePrice.percent(this.value));
  }

  public consume(): void {
    (this.props as { uses: number }).uses += 1;
    this.touch();
  }
}

// ===========================================================================
// PAYMENT
// ===========================================================================
export type PaymentProps = {
  registrationId: string;
  externalReference: string; // inscrição.id
  gatewayOrderId?: string | null;
  amount: Money;
  status: PaymentStatus;
  method?: PaymentMethod | null;
  payloadRaw?: string | null; // último payload recebido (auditoria)
  paidAt?: Date | null;
  refundedAt?: Date | null;
};

export class Payment extends AggregateRoot<PaymentProps> {
  private constructor(params: EntityConstructorParams<PaymentProps>) { super(params); }

  get registrationId(): string { return this.props.registrationId; }
  get externalReference(): string { return this.props.externalReference; }
  get status(): PaymentStatus { return this.props.status; }
  get amount(): Money { return this.props.amount; }
  get gatewayOrderId(): string | null { return this.props.gatewayOrderId ?? null; }
  get paidAt(): Date | null { return this.props.paidAt ?? null; }
  get refundedAt(): Date | null { return this.props.refundedAt ?? null; }
  get method(): PaymentMethod | null { return this.props.method ?? null; }

  public static create(params: { registrationId: string; externalReference: string; amount: Money }): Result<Payment> {
    return Result.ok(new Payment({
      props: {
        registrationId: params.registrationId,
        externalReference: params.externalReference,
        amount: params.amount,
        status: "CRIADO",
        gatewayOrderId: null,
        method: null,
        payloadRaw: null,
        paidAt: null,
        refundedAt: null,
      },
    }));
  }

  public static reconstitute(params: EntityConstructorParams<PaymentProps> & { id: Identifier }): Payment {
    return new Payment(params);
  }

  public attachGatewayOrder(id: string): void {
    this.props.gatewayOrderId = id;
    this.props.status = "AGUARDANDO";
    this.touch();
  }

  public markPaid(method: PaymentMethod, rawPayload: string): Result<void> {
    this.props.status = "PAGO";
    this.props.method = method;
    this.props.paidAt = new Date();
    this.props.payloadRaw = rawPayload;
    this.touch();
    return Result.ok();
  }

  public markDeclined(rawPayload: string): void {
    if (this.props.status === "PAGO") return; // idempotente
    this.props.status = "RECUSADO";
    this.props.payloadRaw = rawPayload;
    this.touch();
  }

  public markCanceled(rawPayload: string): void {
    this.props.status = "CANCELADO";
    this.props.payloadRaw = rawPayload;
    this.touch();
  }

  public markExpired(rawPayload: string): void {
    this.props.status = "EXPIRADO";
    this.props.payloadRaw = rawPayload;
    this.touch();
  }

  public markRefunded(): void {
    this.props.status = "ESTORNADO";
    this.props.refundedAt = new Date();
    this.touch();
  }

  public needsRefund(): void {
    this.props.status = "ESTORNO_NECESSARIO";
    this.touch();
  }
}

// ===========================================================================
// CHECK-IN
// ===========================================================================
export type CheckInProps = {
  registrationId: string;
  eventId: string;
  status: CheckInStatus;
  checkedInAt?: Date | null;
  operatorId?: string | null;
  operatorName?: string | null;
  note?: string | null;
};

export class CheckIn extends AggregateRoot<CheckInProps> {
  private constructor(params: EntityConstructorParams<CheckInProps>) { super(params); }

  get status(): CheckInStatus { return this.props.status; }
  get registrationId(): string { return this.props.registrationId; }
  get eventId(): string { return this.props.eventId; }
  get checkedInAt(): Date | null { return this.props.checkedInAt ?? null; }

  public static create(params: { registrationId: string; eventId: string }): CheckIn {
    return new CheckIn({
      props: {
        registrationId: params.registrationId,
        eventId: params.eventId,
        status: "NAO_REALIZADO",
        checkedInAt: null,
        operatorId: null,
        operatorName: null,
        note: null,
      },
    });
  }

  public static reconstitute(params: EntityConstructorParams<CheckInProps> & { id: Identifier }): CheckIn {
    return new CheckIn(params);
  }

  public perform(params: { operatorId: string; operatorName: string; eventStatus: EventStatus }): Result<void> {
    if (this.props.status === "REALIZADO") {
      return Result.fail(new CheckInAlreadyPerformedError());
    }
    if (params.eventStatus !== "EM_ANDAMENTO") {
      return Result.fail(
        new RegistrationNotEligibleForCheckinError("Check-in permitido apenas durante o evento"),
      );
    }
    this.props.status = "REALIZADO";
    this.props.checkedInAt = new Date();
    this.props.operatorId = params.operatorId;
    this.props.operatorName = params.operatorName;
    this.touch();
    return Result.ok();
  }

  public reopen(params: { operatorId: string; note: string }): Result<void> {
    if (this.props.status !== "REALIZADO") {
      return Result.fail(new Error("Check-in não realizado"));
    }
    this.props.status = "NAO_REALIZADO";
    this.props.note = `Reaberto por ${params.operatorId}: ${params.note}`;
    this.touch();
    return Result.ok();
  }
}

// ===========================================================================
// CERTIFICATE
// ===========================================================================
export type CertificateProps = {
  registrationId: string;
  eventId: string;
  participantName: string;
  eventTitle: string;
  hours: number;
  code: string;
  issuedAt?: Date | null;
};

export class Certificate extends AggregateRoot<CertificateProps> {
  private constructor(params: EntityConstructorParams<CertificateProps>) { super(params); }

  get code(): string { return this.props.code; }
  get participantName(): string { return this.props.participantName; }
  get eventTitle(): string { return this.props.eventTitle; }
  get hours(): number { return this.props.hours; }
  get issuedAt(): Date | null { return this.props.issuedAt ?? null; }
  get registrationId(): string { return this.props.registrationId; }
  get eventId(): string { return this.props.eventId; }

  public static create(params: {
    registrationId: string;
    eventId: string;
    participantName: string;
    eventTitle: string;
    hours: number;
  }): Certificate {
    return new Certificate({
      props: {
        registrationId: params.registrationId,
        eventId: params.eventId,
        participantName: params.participantName,
        eventTitle: params.eventTitle,
        hours: params.hours,
        code: generateCertificateCode(),
        issuedAt: new Date(),
      },
    });
  }

  public static reconstitute(params: EntityConstructorParams<CertificateProps> & { id: Identifier }): Certificate {
    return new Certificate(params);
  }
}

// ===========================================================================
// AUDIT LOG
// ===========================================================================
export type AuditLogProps = {
  userId: string;
  userEmail?: string | null;
  ip?: string | null;
  action: string;
  entity: string;
  entityId: string;
  prevState?: string | null;
  newState?: string | null;
};

export class AuditLog extends AggregateRoot<AuditLogProps> {
  private constructor(params: EntityConstructorParams<AuditLogProps>) { super(params); }

  get userId(): string { return this.props.userId; }
  get action(): string { return this.props.action; }
  get entity(): string { return this.props.entity; }
  get entityId(): string { return this.props.entityId; }

  public static create(params: AuditLogProps): AuditLog {
    return new AuditLog({ props: params });
  }

  public static reconstitute(params: EntityConstructorParams<AuditLogProps> & { id: Identifier }): AuditLog {
    return new AuditLog(params);
  }
}

// ===========================================================================
// USER (perfil local ligado ao RaroNexus)
// ===========================================================================
export type UserProps = {
  globalId: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: UserRole;
};

export class User extends AggregateRoot<UserProps> {
  private constructor(params: EntityConstructorParams<UserProps>) { super(params); }

  get globalId(): string { return this.props.globalId; }
  get name(): string { return this.props.name; }
  get email(): string { return this.props.email; }
  get role(): UserRole { return this.props.role; }
  get avatarUrl(): string | null { return this.props.avatarUrl ?? null; }

  public static reconstitute(params: EntityConstructorParams<UserProps> & { id: Identifier }): User {
    return new User(params);
  }
}
