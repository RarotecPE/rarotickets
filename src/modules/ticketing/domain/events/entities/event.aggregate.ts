import { AggregateRoot } from "@/@core/domain/aggregate-root.base";
import { Identifier } from "@/@core/domain/identifier";
import { Result } from "@/@core/domain/result";
import { DomainError } from "@/@core/domain/errors/domain-error.base";
import { EventTitle } from "../value-objects/event-title.vo";

export type EventStatus = "rascunho" | "agendado" | "inscricoes_abertas" | "inscricoes_encerradas" | "em_andamento" | "finalizado" | "cancelado";
export type EventModality = "presencial" | "online";
export type EventChargeType = "gratuito" | "pago";
export type EventAddress = {
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  municipality: string;
  state: string;
};
export type EventProps = {
  title: string;
  description: string;
  summary: string;
  slug: string;
  bannerUrl: string | null;
  modality: EventModality;
  chargeType: EventChargeType;
  status: EventStatus;
  startAt: Date;
  endAt: Date;
  registrationStartAt: Date;
  registrationEndAt: Date;
  maxCapacity: number;
  allowsWaitlist: boolean;
  onlineUrl: string | null;
  address: EventAddress | null;
  responsibleName: string;
  responsibleEmail: string;
  createdByGlobalUserId: string;
  certificateEnabled: boolean;
  workloadHours: number;
  certificateDescription: string | null;
  deletedAt: Date | null;
};
export type EventConstructorParams = {
  id: Identifier;
  props: EventProps;
  createdAt: Date;
  updatedAt: Date;
};
export type CreateEventParams = EventConstructorParams;
export type EventTransitionParams = {
  nextStatus: EventStatus;
  at: Date;
  justification?: string;
};
export type EventRegistrationWindowParams = { at: Date };

export class EventRuleError extends DomainError {
  constructor(params: EventRuleErrorParams) {
    super(params);
  }
}
export type EventRuleErrorParams = { code: string; message: string };

const ALLOWED_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  rascunho: ["agendado", "cancelado"],
  agendado: ["inscricoes_abertas", "cancelado"],
  inscricoes_abertas: ["inscricoes_encerradas", "cancelado"],
  inscricoes_encerradas: ["em_andamento", "cancelado"],
  em_andamento: ["finalizado", "cancelado"],
  finalizado: [],
  cancelado: [],
};

export class Event extends AggregateRoot<EventProps> {
  private constructor(params: CreateEventParams) {
    super(params);
  }

  static create(params: CreateEventParams): Result<Event, DomainError> {
    const titleResult = EventTitle.create(params.props.title);
    if (titleResult.isFailure) return Result.fail(titleResult.error);
    const validationError = Event.validateProps(params.props);
    if (validationError) return Result.fail(validationError);
    const normalizedProps = { ...params.props, title: titleResult.value.value };
    return Result.ok(new Event({ ...params, props: normalizedProps }));
  }

  static reconstitute(params: CreateEventParams): Event {
    return new Event(params);
  }

  get title(): string { return this.props.title; }
  get slug(): string { return this.props.slug; }
  get status(): EventStatus { return this.props.status; }
  get maxCapacity(): number { return this.props.maxCapacity; }
  get modality(): EventModality { return this.props.modality; }
  get chargeType(): EventChargeType { return this.props.chargeType; }
  get propsSnapshot(): EventProps { return { ...this.props, address: this.props.address ? { ...this.props.address } : null }; }

  canAcceptRegistration(params: EventRegistrationWindowParams): boolean {
    const canBeOpen = this.props.status === "agendado" || this.props.status === "inscricoes_abertas";
    return canBeOpen && params.at >= this.props.registrationStartAt && params.at <= this.props.registrationEndAt;
  }

  transition(params: EventTransitionParams): Result<Event, EventRuleError> {
    if (!ALLOWED_TRANSITIONS[this.props.status].includes(params.nextStatus)) {
      return Result.fail(new EventRuleError({ code: "INVALID_EVENT_TRANSITION", message: `Transição não permitida: ${this.props.status} → ${params.nextStatus}.` }));
    }
    if (params.nextStatus === "cancelado" && !params.justification?.trim()) {
      return Result.fail(new EventRuleError({ code: "CANCELLATION_JUSTIFICATION_REQUIRED", message: "Informe a justificativa do cancelamento." }));
    }
    const newStatus = params.nextStatus === "agendado" && params.at >= this.props.registrationStartAt && params.at <= this.props.registrationEndAt
      ? "inscricoes_abertas"
      : params.nextStatus;
    this.props.status = newStatus;
    this.touch({ at: params.at });
    return Result.ok(this);
  }

  private static validateProps(props: EventProps): EventRuleError | null {
    if (props.description.trim().length < 20) return new EventRuleError({ code: "EVENT_DESCRIPTION_TOO_SHORT", message: "A descrição detalhada precisa ter pelo menos 20 caracteres." });
    if (props.summary.trim().length < 10 || props.summary.length > 220) return new EventRuleError({ code: "EVENT_SUMMARY_INVALID", message: "O resumo deve ter entre 10 e 220 caracteres." });
    if (props.endAt <= props.startAt) return new EventRuleError({ code: "EVENT_DATES_INVALID", message: "O término do evento deve ocorrer depois do início." });
    if (props.registrationStartAt >= props.registrationEndAt || props.registrationEndAt > props.endAt) return new EventRuleError({ code: "REGISTRATION_DATES_INVALID", message: "O período de inscrição é inválido ou termina depois do evento." });
    if (!Number.isInteger(props.maxCapacity) || props.maxCapacity <= 0) return new EventRuleError({ code: "EVENT_CAPACITY_INVALID", message: "A capacidade máxima precisa ser maior que zero." });
    if (props.modality === "presencial" && !Event.hasCompleteAddress(props.address)) return new EventRuleError({ code: "EVENT_ADDRESS_REQUIRED", message: "Eventos presenciais precisam de endereço completo." });
    if (props.modality === "online" && !Event.isSafeUrl(props.onlineUrl)) return new EventRuleError({ code: "EVENT_ONLINE_URL_REQUIRED", message: "Eventos online precisam de um link seguro de transmissão." });
    if (props.chargeType === "gratuito" && props.workloadHours < 0) return new EventRuleError({ code: "EVENT_WORKLOAD_INVALID", message: "A carga horária não pode ser negativa." });
    return null;
  }

  private static hasCompleteAddress(address: EventAddress | null): boolean {
    return Boolean(address && address.street && address.number && address.neighborhood && address.municipality && /^[A-Z]{2}$/.test(address.state));
  }

  private static isSafeUrl(value: string | null): boolean {
    if (!value) return false;
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }
}
