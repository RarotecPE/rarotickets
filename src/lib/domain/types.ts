// ---------------------------------------------------------------------------
// Enums / Literal types usados por todo o domínio
// ---------------------------------------------------------------------------

export type EventModality = "PRESENCIAL" | "ONLINE";
export type FinancialType = "GRATUITO" | "PAGO";
export type EventStatus =
  | "RASCUNHO"
  | "AGENDADO"
  | "INSCRICOES_ABERTAS"
  | "INSCRICOES_ENCERRADAS"
  | "EM_ANDAMENTO"
  | "FINALIZADO"
  | "CANCELADO";

export type RegistrationStatus =
  | "PENDENTE"
  | "AGUARDANDO_PAGAMENTO"
  | "CONFIRMADA"
  | "CANCELADA"
  | "LISTA_ESPERA";

export type CancellationReason =
  | "TIMEOUT_RESERVA"
  | "PAGAMENTO_RECUSADO"
  | "PAGAMENTO_EXPIRADO"
  | "ADMINISTRATIVO"
  | "SOLICITACAO_PARTICIPANTE"
  | "PAGAMENTO_TARDIO_SEM_VAGA";

export type PaymentStatus =
  | "CRIADO"
  | "AGUARDANDO"
  | "PAGO"
  | "RECUSADO"
  | "CANCELADO"
  | "EXPIRADO"
  | "ESTORNADO"
  | "ESTORNO_NECESSARIO";

export type PaymentMethod = "PIX" | "CARTAO" | "BOLETO" | "CORTESIA";

export type CouponType = "PERCENTUAL" | "VALOR_FIXO" | "CORTESIA";

export type CheckInStatus = "NAO_REALIZADO" | "REALIZADO";

export type UserRole =
  | "ADMINISTRADOR"
  | "GERENTE_EVENTO"
  | "FINANCEIRO"
  | "ATENDIMENTO"
  | "CHECKIN"
  | "CONSULTA";

export type IdpReference = { kind: "RARONEXUS"; globalId: string } | { kind: "PARTICIPANTE" };
