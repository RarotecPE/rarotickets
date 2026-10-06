export const EVENT_STATUSES = [
  'RASCUNHO',
  'AGENDADO',
  'INSCRICOES_ABERTAS',
  'INSCRICOES_ENCERRADAS',
  'EM_ANDAMENTO',
  'FINALIZADO',
  'CANCELADO',
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];
export type EventModality = 'PRESENCIAL' | 'ONLINE';

export function isEventStatus(value: string): value is EventStatus {
  return EVENT_STATUSES.includes(value as EventStatus);
}
