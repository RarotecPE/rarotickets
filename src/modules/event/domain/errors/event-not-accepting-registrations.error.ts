import { DomainError } from '@core/domain/errors/domain-error.base';

export type RegistrationBlockReason =
  | 'RASCUNHO'
  | 'CANCELADO'
  | 'INSCRICOES_ENCERRADAS'
  | 'INSCRICOES_NAO_INICIADAS'
  | 'FINALIZADO'
  | 'EM_ANDAMENTO'
  | 'CAPACIDADE_ATINGIDA'
  | 'SEM_VAGA_DISPONIVEL';

const MESSAGES: Record<RegistrationBlockReason, string> = {
  RASCUNHO: 'Evento em rascunho não aceita inscrições públicas',
  CANCELADO: 'Evento cancelado não aceita novas inscrições',
  INSCRICOES_ENCERRADAS:
    'As inscrições deste evento estão encerradas — somente ação administrativa autorizada pode incluir inscrições',
  INSCRICOES_NAO_INICIADAS: 'O período de inscrições deste evento ainda não começou',
  FINALIZADO: 'Evento finalizado não aceita novas inscrições',
  EM_ANDAMENTO: 'Evento em andamento não aceita novas inscrições',
  CAPACIDADE_ATINGIDA: 'A capacidade máxima do evento foi atingida',
  SEM_VAGA_DISPONIVEL: 'Não há vagas disponíveis neste momento',
};

export class EventNotAcceptingRegistrationsError extends DomainError {
  public readonly reason: RegistrationBlockReason;

  constructor(reason: RegistrationBlockReason) {
    super({ message: MESSAGES[reason], code: 'EVENT_NOT_ACCEPTING_REGISTRATIONS' });
    this.reason = reason;
  }
}
