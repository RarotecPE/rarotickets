import { AggregateRoot } from '../../../../@core/domain/aggregate-root.base.ts';
import { Identifier } from '../../../../@core/domain/identifier.ts';
import type { EntityConstructorParams } from '../../../../@core/domain/entity.base.ts';
import { Result } from '../../../../@core/domain/result.ts';
import { InvalidStateError, ValidationError } from '../../../../@core/domain/errors/domain-errors.ts';
import type {
  EventAgendaItem,
  EventCertificateSettings,
  EventKind,
  EventLocation,
  EventPaymentSettings,
  EventSpeaker,
  EventStatus,
} from '../value-objects/event.types.ts';

export type EventProps = {
  title: string;
  summary: string;
  description: string;
  imageUrl: string | null;
  startsAt: Date;
  endsAt: Date;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  location: EventLocation;
  isOnline: boolean;
  onlineUrl: string | null;
  capacity: number | null;
  responsibleUserId: string;
  kind: EventKind;
  status: EventStatus;
  certificate: EventCertificateSettings;
  waitlistEnabled: boolean;
  payment: EventPaymentSettings;
  speakers: EventSpeaker[];
  agenda: EventAgendaItem[];
};

export type CreateEventParams = Omit<EventProps, 'status' | 'speakers' | 'agenda'> & {
  id?: string;
  now?: Date;
  speakers?: EventSpeaker[];
  agenda?: EventAgendaItem[];
};
export type EventRegistrationAccessParams = {
  now: Date;
  isPublic: boolean;
  authorizedClosedWindowOverride: boolean;
};
export type EventTransitionParams = { now: Date };
export type CancelEventParams = { reason: string; now: Date };
export type ReplaceEventAgendaParams = { speakers: EventSpeaker[]; agenda: EventAgendaItem[]; now: Date };
export type ValidateEventAgendaParams = { speakers: EventSpeaker[]; agenda: EventAgendaItem[] };
export type EventSnapshot = EventProps & { id: string; createdAt: Date; updatedAt: Date };

export class Event extends AggregateRoot<EventProps> {
  private constructor(params: EntityConstructorParams<EventProps>) {
    super(params);
  }

  public static create(params: CreateEventParams): Result<Event, ValidationError> {
    const error = this.validate(params);
    if (error) return Result.fail(error);

    const props: EventProps = {
      title: params.title.trim(),
      summary: params.summary.trim(),
      description: params.description.trim(),
      imageUrl: this.cleanNullable(params.imageUrl),
      startsAt: this.copyDate(params.startsAt),
      endsAt: this.copyDate(params.endsAt),
      registrationOpensAt: this.copyDate(params.registrationOpensAt),
      registrationClosesAt: this.copyDate(params.registrationClosesAt),
      location: this.copyLocation(params.location),
      isOnline: params.isOnline,
      onlineUrl: this.cleanNullable(params.onlineUrl),
      capacity: params.capacity,
      responsibleUserId: params.responsibleUserId.trim(),
      kind: params.kind,
      status: 'RASCUNHO',
      certificate: { ...params.certificate },
      waitlistEnabled: params.waitlistEnabled,
      payment: { ...params.payment, allowedMethods: [...params.payment.allowedMethods] },
      speakers: this.copySpeakers(params.speakers ?? []),
      agenda: this.copyAgenda(params.agenda ?? []),
    };
    const entityParams: EntityConstructorParams<EventProps> = {
      props,
      ...(params.now ? { createdAt: params.now, updatedAt: params.now } : {}),
    };
    if (params.id) entityParams.id = Identifier.fromExisting(params.id);
    return Result.ok(new Event(entityParams));
  }

  public get title(): string { return this.props.title; }
  public get summary(): string { return this.props.summary; }
  public get description(): string { return this.props.description; }
  public get imageUrl(): string | null { return this.props.imageUrl; }
  public get startsAt(): Date { return Event.copyDate(this.props.startsAt); }
  public get endsAt(): Date { return Event.copyDate(this.props.endsAt); }
  public get registrationOpensAt(): Date { return Event.copyDate(this.props.registrationOpensAt); }
  public get registrationClosesAt(): Date { return Event.copyDate(this.props.registrationClosesAt); }
  public get location(): EventLocation { return Event.copyLocation(this.props.location); }
  public get isOnline(): boolean { return this.props.isOnline; }
  public get onlineUrl(): string | null { return this.props.onlineUrl; }
  public get capacity(): number | null { return this.props.capacity; }
  public get responsibleUserId(): string { return this.props.responsibleUserId; }
  public get kind(): EventKind { return this.props.kind; }
  public get status(): EventStatus { return this.props.status; }
  public get certificate(): EventCertificateSettings { return { ...this.props.certificate }; }
  public get waitlistEnabled(): boolean { return this.props.waitlistEnabled; }
  public get payment(): EventPaymentSettings { return { ...this.props.payment, allowedMethods: [...this.props.payment.allowedMethods] }; }
  public get speakers(): EventSpeaker[] { return Event.copySpeakers(this.props.speakers); }
  public get agenda(): EventAgendaItem[] { return Event.copyAgenda(this.props.agenda); }

  public publish(params: EventTransitionParams): Result<void, InvalidStateError> {
    if (this.props.status !== 'RASCUNHO') {
      return Result.fail(new InvalidStateError({ code: 'EVENT_NOT_DRAFT', message: 'Somente eventos em rascunho podem ser publicados.' }));
    }
    this.props.status = this.statusAt(params.now);
    this.touch({ at: params.now });
    return Result.ok();
  }

  public refreshStatus(params: EventTransitionParams): Result<void, InvalidStateError> {
    if (this.props.status === 'CANCELADO' || this.props.status === 'RASCUNHO') return Result.ok();
    if (params.now.getTime() >= this.props.endsAt.getTime()) {
      this.props.status = 'FINALIZADO';
    } else if (params.now.getTime() >= this.props.startsAt.getTime()) {
      this.props.status = 'EM_ANDAMENTO';
    } else if (this.props.status === 'AGENDADO' || this.props.status === 'INSCRICOES_ABERTAS') {
      this.props.status = this.statusAt(params.now);
    }
    this.touch({ at: params.now });
    return Result.ok();
  }

  public openRegistrations(params: EventTransitionParams): Result<void, InvalidStateError> {
    if (this.props.status !== 'AGENDADO' && this.props.status !== 'INSCRICOES_ENCERRADAS') {
      return Result.fail(new InvalidStateError({ code: 'EVENT_CANNOT_OPEN_REGISTRATIONS', message: 'O evento não pode abrir inscrições no estado atual.' }));
    }
    if (params.now.getTime() > this.props.registrationClosesAt.getTime()) {
      return Result.fail(new InvalidStateError({ code: 'REGISTRATION_PERIOD_ENDED', message: 'O período de inscrições deste evento terminou.' }));
    }
    this.props.status = 'INSCRICOES_ABERTAS';
    this.touch({ at: params.now });
    return Result.ok();
  }

  public closeRegistrations(params: EventTransitionParams): Result<void, InvalidStateError> {
    if (this.props.status !== 'AGENDADO' && this.props.status !== 'INSCRICOES_ABERTAS') {
      return Result.fail(new InvalidStateError({ code: 'EVENT_CANNOT_CLOSE_REGISTRATIONS', message: 'As inscrições não podem ser encerradas no estado atual.' }));
    }
    this.props.status = 'INSCRICOES_ENCERRADAS';
    this.touch({ at: params.now });
    return Result.ok();
  }

  public cancel(params: CancelEventParams): Result<void, ValidationError | InvalidStateError> {
    if (!params.reason.trim()) {
      return Result.fail(new ValidationError({ code: 'EVENT_CANCELLATION_REASON_REQUIRED', message: 'Informe o motivo do cancelamento do evento.' }));
    }
    if (this.props.status === 'CANCELADO') {
      return Result.fail(new InvalidStateError({ code: 'EVENT_ALREADY_CANCELLED', message: 'O evento já está cancelado.' }));
    }
    this.props.status = 'CANCELADO';
    this.touch({ at: params.now });
    return Result.ok();
  }

  public checkRegistrationAccess(params: EventRegistrationAccessParams): Result<void, InvalidStateError> {
    if (this.props.status === 'CANCELADO' || this.props.status === 'FINALIZADO' || this.props.status === 'EM_ANDAMENTO') {
      return Result.fail(new InvalidStateError({ code: 'EVENT_NOT_ACCEPTING_REGISTRATIONS', message: 'O evento não aceita novas inscrições.' }));
    }
    if (this.props.status === 'RASCUNHO') {
      return params.isPublic
        ? Result.fail(new InvalidStateError({ code: 'EVENT_DRAFT_NOT_PUBLIC', message: 'Eventos em rascunho não aceitam inscrições públicas.' }))
        : Result.ok();
    }

    const now = params.now.getTime();
    const withinPeriod = now >= this.props.registrationOpensAt.getTime()
      && now <= this.props.registrationClosesAt.getTime();
    const isClosed = this.props.status === 'INSCRICOES_ENCERRADAS' || !withinPeriod;
    if (isClosed && params.authorizedClosedWindowOverride && !params.isPublic) return Result.ok();
    if (isClosed || this.props.status !== 'INSCRICOES_ABERTAS') {
      return Result.fail(new InvalidStateError({ code: 'REGISTRATION_WINDOW_CLOSED', message: 'As inscrições do evento estão encerradas.' }));
    }
    return Result.ok();
  }

  public replaceAgenda(params: ReplaceEventAgendaParams): Result<void, ValidationError> {
    const agendaError = Event.validateAgenda({ speakers: params.speakers, agenda: params.agenda });
    if (agendaError) return Result.fail(agendaError);
    this.props.speakers = Event.copySpeakers(params.speakers);
    this.props.agenda = Event.copyAgenda(params.agenda);
    this.touch({ at: params.now });
    return Result.ok();
  }

  public snapshot(): EventSnapshot {
    return {
      ...this.props,
      startsAt: this.startsAt,
      endsAt: this.endsAt,
      registrationOpensAt: this.registrationOpensAt,
      registrationClosesAt: this.registrationClosesAt,
      location: this.location,
      certificate: this.certificate,
      payment: this.payment,
      speakers: this.speakers,
      agenda: this.agenda,
      id: this.id.toString(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private statusAt(now: Date): EventStatus {
    if (now.getTime() >= this.props.endsAt.getTime()) return 'FINALIZADO';
    if (now.getTime() >= this.props.startsAt.getTime()) return 'EM_ANDAMENTO';
    if (now.getTime() < this.props.registrationOpensAt.getTime()) return 'AGENDADO';
    if (now.getTime() <= this.props.registrationClosesAt.getTime()) return 'INSCRICOES_ABERTAS';
    return 'INSCRICOES_ENCERRADAS';
  }

  private static validate(params: CreateEventParams): ValidationError | null {
    if (!params.title.trim() || !params.responsibleUserId.trim()) {
      return new ValidationError({ code: 'EVENT_REQUIRED_FIELDS', message: 'Título e responsável são obrigatórios.' });
    }
    if (params.startsAt.getTime() >= params.endsAt.getTime()) {
      return new ValidationError({ code: 'EVENT_DATES_INVALID', message: 'A data final do evento deve ser posterior à data inicial.' });
    }
    if (params.registrationOpensAt.getTime() >= params.registrationClosesAt.getTime()) {
      return new ValidationError({ code: 'REGISTRATION_DATES_INVALID', message: 'O encerramento das inscrições deve ser posterior à abertura.' });
    }
    if (params.capacity !== null && (!Number.isSafeInteger(params.capacity) || params.capacity <= 0)) {
      return new ValidationError({ code: 'EVENT_CAPACITY_INVALID', message: 'A capacidade deve ser um número inteiro positivo ou ilimitada.' });
    }
    if (params.isOnline && !this.isValidUrl(params.onlineUrl)) {
      return new ValidationError({ code: 'ONLINE_EVENT_LINK_REQUIRED', message: 'Eventos online devem possuir um link válido.' });
    }
    if (!params.isOnline && (!params.location.venue?.trim() || !params.location.address?.trim()
      || !params.location.municipality?.trim() || !params.location.state?.trim())) {
      return new ValidationError({ code: 'EVENT_LOCATION_REQUIRED', message: 'Informe local, endereço, município e estado para eventos presenciais.' });
    }
    if (params.certificate.enabled && params.certificate.workloadMinutes !== null
      && (!Number.isSafeInteger(params.certificate.workloadMinutes) || params.certificate.workloadMinutes <= 0)) {
      return new ValidationError({ code: 'CERTIFICATE_WORKLOAD_INVALID', message: 'A carga horária do certificado deve ser positiva.' });
    }
    if (params.payment.reservationDurationMinutes !== null
      && (!Number.isSafeInteger(params.payment.reservationDurationMinutes) || params.payment.reservationDurationMinutes <= 0)) {
      return new ValidationError({ code: 'RESERVATION_DURATION_INVALID', message: 'O prazo de reserva deve ser um número inteiro positivo.' });
    }
    if (!Number.isSafeInteger(params.payment.maxInstallments) || params.payment.maxInstallments < 1) {
      return new ValidationError({ code: 'INSTALLMENT_LIMIT_INVALID', message: 'A quantidade máxima de parcelas deve ser positiva.' });
    }
    return this.validateAgenda({ speakers: params.speakers ?? [], agenda: params.agenda ?? [] });
  }

  private static validateAgenda(params: ValidateEventAgendaParams): ValidationError | null {
    const speakerIds = new Set<string>();
    for (const speaker of params.speakers) {
      if (!speaker.id.trim() || !speaker.name.trim() || speakerIds.has(speaker.id)) {
        return new ValidationError({ code: 'EVENT_SPEAKER_INVALID', message: 'Cada palestrante deve possuir identificador e nome únicos.' });
      }
      speakerIds.add(speaker.id);
    }
    const activityIds = new Set<string>();
    for (const activity of params.agenda) {
      if (!activity.id.trim() || !activity.title.trim() || activityIds.has(activity.id)
        || activity.startsAt.getTime() >= activity.endsAt.getTime()) {
        return new ValidationError({ code: 'EVENT_AGENDA_INVALID', message: 'Cada atividade da programação deve possuir dados válidos e horário final posterior ao inicial.' });
      }
      if (activity.speakerIds.some((speakerId) => !speakerIds.has(speakerId))) {
        return new ValidationError({ code: 'EVENT_AGENDA_SPEAKER_INVALID', message: 'A programação referencia um palestrante inexistente.' });
      }
      activityIds.add(activity.id);
    }
    return null;
  }

  private static isValidUrl(value: string | null): boolean {
    if (!value?.trim()) return false;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }

  private static cleanNullable(value: string | null): string | null {
    const cleaned = value?.trim() ?? '';
    return cleaned || null;
  }

  private static copyDate(value: Date): Date {
    return new Date(value.getTime());
  }

  private static copyLocation(value: EventLocation): EventLocation {
    return { ...value };
  }

  private static copySpeakers(value: EventSpeaker[]): EventSpeaker[] {
    return value.map((speaker) => ({ ...speaker }));
  }

  private static copyAgenda(value: EventAgendaItem[]): EventAgendaItem[] {
    return value.map((item) => ({
      ...item,
      startsAt: this.copyDate(item.startsAt),
      endsAt: this.copyDate(item.endsAt),
      speakerIds: [...item.speakerIds],
    }));
  }
}
