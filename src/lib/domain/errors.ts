import { NotFoundError } from "@/@core/domain/errors/not-found.error";
import { ConflictError } from "@/@core/domain/errors/conflict.error";
import { DomainError } from "@/@core/domain/errors/domain-error.base";

// --- Eventos ---
export class EventNotFoundError extends NotFoundError {
  constructor(id: string) {
    super({
      code: "EVENTO_NAO_ENCONTRADO",
      message: `Evento "${id}" não encontrado`,
    });
    this.name = "EventNotFoundError";
  }
}

export class InvalidEventStatusTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super({
      code: "TRANSICAO_INVALIDA",
      message: `Transição de status "${from}" → "${to}" não permitida`,
    });
    this.name = "InvalidEventStatusTransitionError";
  }
}

// --- Lotes ---
export class LotNotFoundError extends NotFoundError {
  constructor(id: string) {
    super({ code: "LOTE_NAO_ENCONTRADO", message: `Lote "${id}" não encontrado` });
    this.name = "LotNotFoundError";
  }
}

// --- Inscrições ---
export class RegistrationNotFoundError extends NotFoundError {
  constructor(id: string) {
    super({
      code: "INSCRICAO_NAO_ENCONTRADA",
      message: `Inscrição "${id}" não encontrada`,
    });
    this.name = "RegistrationNotFoundError";
  }
}

export class SoldOutError extends ConflictError {
  constructor() {
    super({
      code: "VAGAS_ESGOTADAS",
      message: "Vagas esgotadas para este evento",
    });
    this.name = "SoldOutError";
  }
}

export class InvalidRegistrationTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super({
      code: "INSCRICAO_TRANSICAO_INVALIDA",
      message: `Transição de inscrição "${from}" → "${to}" não permitida`,
    });
    this.name = "InvalidRegistrationTransitionError";
  }
}

export class RegistrationNotEligibleForCheckinError extends DomainError {
  constructor(reason: string) {
    super({ code: "CHECKIN_NAO_PERMITIDO", message: reason });
    this.name = "RegistrationNotEligibleForCheckinError";
  }
}

export class CheckInAlreadyPerformedError extends DomainError {
  constructor() {
    super({ code: "CHECKIN_JA_REALIZADO", message: "Check-in já realizado" });
    this.name = "CheckInAlreadyPerformedError";
  }
}

// --- Participante ---
export class ParticipantNotFoundError extends NotFoundError {
  constructor(id: string) {
    super({
      code: "PARTICIPANTE_NAO_ENCONTRADO",
      message: `Participante "${id}" não encontrado`,
    });
    this.name = "ParticipantNotFoundError";
  }
}

// --- Pagamentos ---
export class PaymentNotFoundError extends NotFoundError {
  constructor(id: string) {
    super({ code: "PAGAMENTO_NAO_ENCONTRADO", message: `Pagamento "${id}" não encontrado` });
    this.name = "PaymentNotFoundError";
  }
}

export class InvalidCouponError extends DomainError {
  constructor(reason: string) {
    super({ code: "CUPOM_INVALIDO", message: reason });
    this.name = "InvalidCouponError";
  }
}

// --- Certificados ---
export class CertificateNotEligibleError extends DomainError {
  constructor(reason: string) {
    super({ code: "CERTIFICADO_NAO_ELEGIVEL", message: reason });
    this.name = "CertificateNotEligibleError";
  }
}

// --- Geral ---
export class ForbiddenError extends DomainError {
  constructor(message = "Acesso negado") {
    super({ code: "ACESSO_NEGADO", message });
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = "Não autenticado") {
    super({ code: "NAO_AUTENTICADO", message });
    this.name = "UnauthorizedError";
  }
}
