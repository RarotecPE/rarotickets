import { AggregateRoot } from '@core/domain/aggregate-root.base';
import type { EntityConstructorParams } from '@core/domain/entity.base';
import { Result } from '@core/domain/result';
import { CertificateSettings } from '../value-objects/certificate-settings.vo';
import type { CreateCertificateSettingsParams } from '../value-objects/certificate-settings.vo';
import { EventCapacity } from '../value-objects/event-capacity.vo';
import { EventDescription } from '../value-objects/event-description.vo';
import { EventLocation } from '../value-objects/event-location.vo';
import type { CreateEventLocationParams } from '../value-objects/event-location.vo';
import { EventPeriod } from '../value-objects/event-period.vo';
import { EventSlug } from '../value-objects/event-slug.vo';
import { EventStatus } from '../value-objects/event-status.vo';
import type { EventStatusValue } from '../value-objects/event-status.vo';
import { EventSummary } from '../value-objects/event-summary.vo';
import { EventTitle } from '../value-objects/event-title.vo';
import { EventType } from '../value-objects/event-type.vo';
import { ImageUrl } from '../value-objects/image-url.vo';
import { PaymentSettings } from '../value-objects/payment-settings.vo';
import type { CreatePaymentSettingsParams } from '../value-objects/payment-settings.vo';
import { RegistrationWindow } from '../value-objects/registration-window.vo';
import { Responsible } from '../value-objects/responsible.vo';
import { WaitlistSettings } from '../value-objects/waitlist-settings.vo';
import { WorkloadHours } from '../value-objects/workload-hours.vo';
import { EventNotAcceptingRegistrationsError } from '../errors/event-not-accepting-registrations.error';
import type { RegistrationBlockReason } from '../errors/event-not-accepting-registrations.error';
import { InvalidEventStatusTransitionError } from '../errors/invalid-event-status-transition.error';
import {
  RegistrationPolicyError,
  RegistrationPolicyService,
} from '@core/domain/services/registration-policy.service';

export type EventProps = {
  slug: EventSlug;
  title: EventTitle;
  summary: EventSummary;
  description: EventDescription;
  imageUrl: ImageUrl;
  period: EventPeriod;
  location: EventLocation;
  capacity: EventCapacity;
  registrationWindow: RegistrationWindow;
  responsible: Responsible;
  workload: WorkloadHours;
  type: EventType;
  status: EventStatus;
  certificate: CertificateSettings;
  waitlist: WaitlistSettings;
  payment: PaymentSettings;
  formVersion: number;
  createdBy: string | null;
  publishedAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
};
export type EventConstructorParams = EntityConstructorParams<EventProps>;
export type ReconstituteEventParams = EventConstructorParams & {
  id: NonNullable<EventConstructorParams['id']>;
};
export type CreateEventParams = {
  title: string;
  summary: string;
  description: string;
  imageUrl?: string | null;
  period: { startDate: string; endDate: string; startTime: string; endTime: string };
  location: CreateEventLocationParams;
  capacity: number;
  registrationWindow: { start: Date | string; end: Date | string };
  responsible: { name: string; email?: string | null };
  workloadHours: number;
  type: string;
  certificate?: CreateCertificateSettingsParams;
  waitlist?: { enabled: boolean; autoPromote?: boolean };
  payment?: Partial<CreatePaymentSettingsParams>;
  slugSuffix?: string;
  createdBy?: string | null;
};
export type UpdateEventDetailsParams = Partial<Omit<CreateEventParams, 'createdBy' | 'slugSuffix'>> & {
  capacity?: number;
};
export type ChangeStatusParams = { next: EventStatusValue; at: Date; reason?: string | null };
export type CanAcceptRegistrationParams = {
  at: Date;
  /** Autoriza ações administrativas fora do período/padrão (§2 e §3). */
  allowAdministrativeOverride?: boolean;
  hasAvailableSeat?: boolean;
};
export type ChangeCapacityParams = { capacity: number; occupiedSeats: number };

const DEFAULT_PAYMENT_SETTINGS: CreatePaymentSettingsParams = {
  seatReservationMinutes: 15,
  maxInstallments: 1,
  allowPix: true,
  allowBoleto: true,
  allowCreditCard: true,
  minInstallmentCents: 500,
};

/**
 * Evento — Aggregate Root que protege as invariantes de vagas, período de
 * inscrições e ciclo de status (§2, §3 e §4).
 */
export class Event extends AggregateRoot<EventProps> {
  private constructor(params: EventConstructorParams) {
    super(params);
  }

  get slug(): EventSlug { return this.props.slug; }
  get title(): EventTitle { return this.props.title; }
  get summary(): EventSummary { return this.props.summary; }
  get description(): EventDescription { return this.props.description; }
  get imageUrl(): ImageUrl { return this.props.imageUrl; }
  get period(): EventPeriod { return this.props.period; }
  get location(): EventLocation { return this.props.location; }
  get capacity(): EventCapacity { return this.props.capacity; }
  get registrationWindow(): RegistrationWindow { return this.props.registrationWindow; }
  get responsible(): Responsible { return this.props.responsible; }
  get workload(): WorkloadHours { return this.props.workload; }
  get type(): EventType { return this.props.type; }
  get status(): EventStatus { return this.props.status; }
  get certificateSettings(): CertificateSettings { return this.props.certificate; }
  get waitlistSettings(): WaitlistSettings { return this.props.waitlist; }
  get paymentSettings(): PaymentSettings { return this.props.payment; }
  get formVersion(): number { return this.props.formVersion; }
  get createdBy(): string | null { return this.props.createdBy; }
  get publishedAt(): Date | null { return this.props.publishedAt; }
  get cancelledAt(): Date | null { return this.props.cancelledAt; }
  get cancelReason(): string | null { return this.props.cancelReason; }

  public static create(params: CreateEventParams): Result<Event> {
    const titleResult = EventTitle.create(params.title);
    if (titleResult.isFailure) return Result.fail(titleResult.error);

    const summaryResult = EventSummary.create(params.summary);
    if (summaryResult.isFailure) return Result.fail(summaryResult.error);

    const descriptionResult = EventDescription.create(params.description);
    if (descriptionResult.isFailure) return Result.fail(descriptionResult.error);

    const periodResult = EventPeriod.create(params.period);
    if (periodResult.isFailure) return Result.fail(periodResult.error);

    const locationResult = EventLocation.create(params.location);
    if (locationResult.isFailure) return Result.fail(locationResult.error);

    const capacityResult = EventCapacity.create(params.capacity);
    if (capacityResult.isFailure) return Result.fail(capacityResult.error);

    const windowResult = RegistrationWindow.create(params.registrationWindow);
    if (windowResult.isFailure) return Result.fail(windowResult.error);

    const responsibleResult = Responsible.create(params.responsible);
    if (responsibleResult.isFailure) return Result.fail(responsibleResult.error);

    const workloadResult = WorkloadHours.create(params.workloadHours ?? 0);
    if (workloadResult.isFailure) return Result.fail(workloadResult.error);

    const typeResult = EventType.create(params.type);
    if (typeResult.isFailure) return Result.fail(typeResult.error);

    const certificateResult = params.certificate
      ? CertificateSettings.create(params.certificate)
      : Result.ok(CertificateSettings.disabled());
    if (certificateResult.isFailure) return Result.fail(certificateResult.error);

    const waitlistResult = params.waitlist
      ? WaitlistSettings.create(params.waitlist)
      : Result.ok(WaitlistSettings.disabled());
    if (waitlistResult.isFailure) return Result.fail(waitlistResult.error);

    const paymentResult = PaymentSettings.create(
      { ...DEFAULT_PAYMENT_SETTINGS, ...params.payment },
      typeResult.value,
    );
    if (paymentResult.isFailure) return Result.fail(paymentResult.error);

    return Result.ok(new Event({
      props: {
        slug: EventSlug.fromTitle(titleResult.value.value, params.slugSuffix),
        title: titleResult.value,
        summary: summaryResult.value,
        description: descriptionResult.value,
        imageUrl: ImageUrl.create(params.imageUrl).isSuccess
          ? ImageUrl.create(params.imageUrl).value
          : ImageUrl.reconstitute(null),
        period: periodResult.value,
        location: locationResult.value,
        capacity: capacityResult.value,
        registrationWindow: windowResult.value,
        responsible: responsibleResult.value,
        workload: workloadResult.value,
        type: typeResult.value,
        status: EventStatus.reconstitute('RASCUNHO'),
        certificate: certificateResult.value,
        waitlist: waitlistResult.value,
        payment: paymentResult.value,
        formVersion: 1,
        createdBy: params.createdBy ?? null,
        publishedAt: null,
        cancelledAt: null,
        cancelReason: null,
      },
    }));
  }

  public static reconstitute(params: ReconstituteEventParams): Event {
    return new Event(params);
  }

  /** Atualiza dados do evento — bloqueado para eventos finalizados/cancelados. */
  public updateDetails(params: UpdateEventDetailsParams): Result<void> {
    if (this.props.status.isCancelled()) return Result.fail(new Error('Evento cancelado não pode ser editado'));
    if (this.props.status.isFinished()) return Result.fail(new Error('Evento finalizado não pode ser editado'));

    if (params.title !== undefined) {
      const result = EventTitle.create(params.title);
      if (result.isFailure) return Result.fail(result.error);
      this.props.title = result.value;
    }
    if (params.summary !== undefined) {
      const result = EventSummary.create(params.summary);
      if (result.isFailure) return Result.fail(result.error);
      this.props.summary = result.value;
    }
    if (params.description !== undefined) {
      const result = EventDescription.create(params.description);
      if (result.isFailure) return Result.fail(result.error);
      this.props.description = result.value;
    }
    if (params.imageUrl !== undefined) {
      const result = ImageUrl.create(params.imageUrl);
      if (result.isFailure) return Result.fail(result.error);
      this.props.imageUrl = result.value;
    }
    if (params.period !== undefined) {
      const result = EventPeriod.create(params.period);
      if (result.isFailure) return Result.fail(result.error);
      this.props.period = result.value;
    }
    if (params.location !== undefined) {
      const result = EventLocation.create(params.location);
      if (result.isFailure) return Result.fail(result.error);
      this.props.location = result.value;
    }
    if (params.registrationWindow !== undefined) {
      const result = RegistrationWindow.create(params.registrationWindow);
      if (result.isFailure) return Result.fail(result.error);
      this.props.registrationWindow = result.value;
    }
    if (params.responsible !== undefined) {
      const result = Responsible.create(params.responsible);
      if (result.isFailure) return Result.fail(result.error);
      this.props.responsible = result.value;
    }
    if (params.workloadHours !== undefined) {
      const result = WorkloadHours.create(params.workloadHours);
      if (result.isFailure) return Result.fail(result.error);
      this.props.workload = result.value;
    }
    if (params.certificate !== undefined) {
      const result = CertificateSettings.create(params.certificate);
      if (result.isFailure) return Result.fail(result.error);
      this.props.certificate = result.value;
    }
    if (params.waitlist !== undefined) {
      const result = WaitlistSettings.create(params.waitlist);
      if (result.isFailure) return Result.fail(result.error);
      this.props.waitlist = result.value;
    }
    if (params.payment !== undefined) {
      const current = this.props.payment;
      const result = PaymentSettings.create(
        {
          seatReservationMinutes: params.payment.seatReservationMinutes ?? current.seatReservationMinutes,
          maxInstallments: params.payment.maxInstallments ?? current.maxInstallments,
          allowPix: params.payment.allowPix ?? current.allowPix,
          allowBoleto: params.payment.allowBoleto ?? current.allowBoleto,
          allowCreditCard: params.payment.allowCreditCard ?? current.allowCreditCard,
          minInstallmentCents: params.payment.minInstallmentCents ?? current.minInstallmentCents,
        },
        this.props.type,
      );
      if (result.isFailure) return Result.fail(result.error);
      this.props.payment = result.value;
    }

    this.touch();
    return Result.ok();
  }

  /** Capacidade nunca pode ser reduzida abaixo das vagas já ocupadas (§3). */
  public changeCapacity(params: ChangeCapacityParams): Result<void> {
    if (params.capacity < params.occupiedSeats) {
      return Result.fail(new Error(
        `Capacidade não pode ser menor que as ${params.occupiedSeats} vagas já ocupadas`,
      ));
    }
    const capacityResult = EventCapacity.create(params.capacity);
    if (capacityResult.isFailure) return Result.fail(capacityResult.error);
    this.props.capacity = capacityResult.value;
    this.touch();
    return Result.ok();
  }

  /** Publica o evento: rascunho passa a agendado ou com inscrições abertas. */
  public publish(at: Date): Result<void> {
    if (!this.props.status.isDraft()) return Result.fail(new Error('Apenas eventos em rascunho podem ser publicados'));

    const next: EventStatusValue = this.props.registrationWindow.isOpenAt(at)
      ? 'INSCRICOES_ABERTAS'
      : 'AGENDADO';
    return this.changeStatus({ next, at });
  }

  /** Aplica transição de status validando as transições permitidas (§2). */
  public changeStatus(params: ChangeStatusParams): Result<void> {
    const nextResult = EventStatus.create(params.next);
    if (nextResult.isFailure) return Result.fail(nextResult.error);
    const next = nextResult.value;

    if (!this.props.status.canTransitionTo(next)) {
      return Result.fail(new InvalidEventStatusTransitionError({
        from: this.props.status.value,
        to: next.value,
      }));
    }

    if (next.value === 'CANCELADO') {
      if (!params.reason || params.reason.trim().length < 5) {
        return Result.fail(new Error('Cancelamento do evento exige um motivo com ao menos 5 caracteres'));
      }
      this.props.cancelledAt = params.at;
      this.props.cancelReason = params.reason.trim();
    }

    this.props.status = next;
    if (next.value === 'INSCRICOES_ABERTAS' && !this.props.publishedAt) {
      this.props.publishedAt = params.at;
    }
    if (next.value === 'AGENDADO' && !this.props.publishedAt) {
      this.props.publishedAt = params.at;
    }

    this.touch();
    return Result.ok();
  }

  /**
   * Sincroniza o status com o relógio: abre/encerra inscrições, marca evento
   * em andamento e finaliza (§39). Retorna se houve alteração.
   */
  public syncStatusWithClock(at: Date): boolean {
    const current = this.props.status.value;
    if (current === 'CANCELADO' || current === 'FINALIZADO' || current === 'RASCUNHO') return false;

    const target = this.resolveStatusByClock(at);
    if (target === current) return false;

    const transition = this.changeStatus({ next: target, at });
    return transition.isSuccess;
  }

  private resolveStatusByClock(at: Date): EventStatusValue {
    if (this.props.period.hasEnded(at)) return 'FINALIZADO';
    if (this.props.period.hasStarted(at)) return 'EM_ANDAMENTO';
    if (this.props.registrationWindow.hasClosed(at)) return 'INSCRICOES_ENCERRADAS';
    if (this.props.registrationWindow.isOpenAt(at)) return 'INSCRICOES_ABERTAS';
    return 'AGENDADO';
  }

  /**
   * Verifica se o evento aceita uma nova inscrição (§2, §3).
   * Rascunho e cancelado nunca aceitam inscrição pública; inscrições
   * encerradas só aceitam com autorização administrativa explícita.
   */
  public canAcceptRegistration(params: CanAcceptRegistrationParams): Result<void> {
    const policy = new RegistrationPolicyService();
    const decision = policy.execute({
      event: {
        status: this.props.status.value,
        registrationStart: this.props.registrationWindow.start,
        registrationEnd: this.props.registrationWindow.end,
        waitlistEnabled: this.props.waitlist.enabled,
        availableSeats: params.hasAvailableSeat === false ? 0 : 1,
        type: this.props.type.value,
      },
      at: params.at,
      allowAdministrativeOverride: params.allowAdministrativeOverride,
    });

    if (decision.isFailure) {
      const reason = decision.error instanceof RegistrationPolicyError
        ? decision.error.reason
        : 'CAPACIDADE_ATINGIDA';
      return Result.fail(new EventNotAcceptingRegistrationsError(reason));
    }
    return Result.ok();
  }

  public allowsWaitlist(): boolean {
    return this.props.waitlist.enabled;
  }

  /** Incrementa a versão do formulário para preservar o histórico (§9). */
  public bumpFormVersion(): void {
    this.props.formVersion += 1;
    this.touch();
  }

  public isRegistrationOpenAt(at: Date): boolean {
    return this.props.status.acceptsPublicRegistration() && this.props.registrationWindow.isOpenAt(at);
  }
}
