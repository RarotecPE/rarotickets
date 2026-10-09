import { AggregateRoot } from "@/@core/domain/aggregate-root.base";
import { Identifier } from "@/@core/domain/identifier";
import { Result } from "@/@core/domain/result";
import { DomainError } from "@/@core/domain/errors/domain-error.base";

export type RegistrationStatus =
  | "pendente"
  | "aguardando_pagamento"
  | "confirmada"
  | "cancelada"
  | "lista_espera";
export type RegistrationProps = {
  code: string;
  eventId: string;
  participantId: string;
  lotId: string | null;
  couponId: string | null;
  answersSnapshot: Record<string, unknown>;
  originalCents: number;
  discountCents: number;
  finalCents: number;
  status: RegistrationStatus;
  reservationExpiresAt: Date | null;
  waitlistExpiresAt: Date | null;
  accessTokenHash: string;
  credentialTokenHash: string | null;
  cancellationReason: string | null;
  confirmedAt: Date | null;
  deletedAt: Date | null;
};
export type RegistrationConstructorParams = {
  id: Identifier;
  props: RegistrationProps;
  createdAt: Date;
  updatedAt: Date;
};
export type RegistrationTransitionParams = {
  nextStatus: RegistrationStatus;
  at: Date;
  reservationExpiresAt?: Date | null;
  reason?: string;
};
export type PromoteFromWaitlistParams = {
  lotId: string | null;
  originalCents: number;
  finalCents: number;
  accessTokenHash: string;
  requiresPayment: boolean;
  at: Date;
  deadline: Date;
};
export type CreateRegistrationParams = RegistrationConstructorParams;

export class RegistrationRuleError extends DomainError {
  constructor(params: RegistrationRuleErrorParams) {
    super(params);
  }
}
export type RegistrationRuleErrorParams = { code: string; message: string };

const ACTIVE_STATUSES: RegistrationStatus[] = [
  "pendente",
  "aguardando_pagamento",
  "confirmada",
];
const ALLOWED_TRANSITIONS: Record<RegistrationStatus, RegistrationStatus[]> = {
  pendente: ["aguardando_pagamento", "confirmada", "cancelada", "lista_espera"],
  aguardando_pagamento: ["confirmada", "cancelada"],
  confirmada: ["cancelada"],
  cancelada: [],
  lista_espera: ["pendente", "cancelada"],
};

export class Registration extends AggregateRoot<RegistrationProps> {
  private constructor(params: CreateRegistrationParams) {
    super(params);
  }

  static create(params: CreateRegistrationParams): Result<Registration, DomainError> {
    const props = params.props;
    if (
      props.finalCents < 0 ||
      props.discountCents < 0 ||
      props.originalCents < props.discountCents ||
      props.finalCents !== props.originalCents - props.discountCents
    ) {
      return Result.fail(
        new RegistrationRuleError({
          code: "INVALID_REGISTRATION_PRICE",
          message: "Os valores da inscrição são inválidos.",
        }),
      );
    }
    if (!props.code || !props.accessTokenHash) {
      return Result.fail(
        new RegistrationRuleError({
          code: "REGISTRATION_IDENTIFIERS_REQUIRED",
          message: "Código e token seguro da inscrição são obrigatórios.",
        }),
      );
    }
    return Result.ok(new Registration(params));
  }

  static reconstitute(params: CreateRegistrationParams): Registration {
    return new Registration(params);
  }

  get status(): RegistrationStatus {
    return this.props.status;
  }
  get eventId(): string {
    return this.props.eventId;
  }
  get participantId(): string {
    return this.props.participantId;
  }
  get code(): string {
    return this.props.code;
  }
  get finalCents(): number {
    return this.props.finalCents;
  }
  get propsSnapshot(): RegistrationProps {
    return { ...this.props, answersSnapshot: { ...this.props.answersSnapshot } };
  }

  isActive(): boolean {
    return ACTIVE_STATUSES.includes(this.props.status);
  }

  promoteFromWaitlist(
    params: PromoteFromWaitlistParams,
  ): Result<Registration, RegistrationRuleError> {
    if (this.props.status !== "lista_espera") {
      return Result.fail(
        new RegistrationRuleError({
          code: "REGISTRATION_NOT_WAITLISTED",
          message: "Somente inscrições na lista de espera podem ser promovidas.",
        }),
      );
    }
    if (
      !params.accessTokenHash ||
      !Number.isSafeInteger(params.originalCents) ||
      !Number.isSafeInteger(params.finalCents) ||
      params.originalCents < 0 ||
      params.finalCents < 0 ||
      params.finalCents > params.originalCents
    ) {
      return Result.fail(
        new RegistrationRuleError({
          code: "INVALID_WAITLIST_PROMOTION",
          message: "Os dados da promoção da lista de espera são inválidos.",
        }),
      );
    }
    if (params.requiresPayment && (!params.lotId || params.finalCents <= 0)) {
      return Result.fail(
        new RegistrationRuleError({
          code: "WAITLIST_PAYMENT_REQUIRED",
          message: "A promoção de um evento pago precisa de lote e valor válido.",
        }),
      );
    }
    if (params.requiresPayment && params.deadline <= params.at) {
      return Result.fail(
        new RegistrationRuleError({
          code: "INVALID_WAITLIST_DEADLINE",
          message: "O prazo para concluir a inscrição precisa estar no futuro.",
        }),
      );
    }

    this.props.lotId = params.lotId;
    this.props.originalCents = params.originalCents;
    this.props.discountCents = params.originalCents - params.finalCents;
    this.props.finalCents = params.finalCents;
    this.props.accessTokenHash = params.accessTokenHash;
    this.props.status = params.requiresPayment ? "pendente" : "confirmada";
    this.props.reservationExpiresAt = params.requiresPayment
      ? params.deadline
      : null;
    this.props.waitlistExpiresAt = params.requiresPayment
      ? params.deadline
      : null;
    this.props.confirmedAt = params.requiresPayment ? null : params.at;
    this.props.cancellationReason = null;
    this.touch({ at: params.at });
    return Result.ok(this);
  }

  transition(
    params: RegistrationTransitionParams,
  ): Result<Registration, RegistrationRuleError> {
    if (!ALLOWED_TRANSITIONS[this.props.status].includes(params.nextStatus)) {
      return Result.fail(
        new RegistrationRuleError({
          code: "INVALID_REGISTRATION_TRANSITION",
          message: `Transição não permitida: ${this.props.status} → ${params.nextStatus}.`,
        }),
      );
    }
    if (
      params.nextStatus === "confirmada" &&
      this.props.finalCents > 0 &&
      this.props.status !== "aguardando_pagamento"
    ) {
      return Result.fail(
        new RegistrationRuleError({
          code: "PAYMENT_REQUIRED",
          message: "Inscrições pagas só são confirmadas após aprovação financeira.",
        }),
      );
    }
    if (params.nextStatus === "cancelada" && !params.reason?.trim()) {
      return Result.fail(
        new RegistrationRuleError({
          code: "CANCELLATION_REASON_REQUIRED",
          message: "Informe o motivo do cancelamento.",
        }),
      );
    }
    this.props.status = params.nextStatus;
    this.props.reservationExpiresAt = params.reservationExpiresAt ?? null;
    if (params.nextStatus === "confirmada") {
      this.props.confirmedAt = params.at;
      this.props.waitlistExpiresAt = null;
    }
    if (params.nextStatus === "cancelada") {
      this.props.cancellationReason = params.reason ?? null;
      this.props.waitlistExpiresAt = null;
      this.props.confirmedAt = null;
    }
    this.touch({ at: params.at });
    return Result.ok(this);
  }
}
