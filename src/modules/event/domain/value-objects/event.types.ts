import type { PaymentMethod } from '../../../../@core/domain/types/payment.types.ts';

export type EventKind = 'GRATUITO' | 'PAGO';
export type EventStatus =
  | 'RASCUNHO'
  | 'AGENDADO'
  | 'INSCRICOES_ABERTAS'
  | 'INSCRICOES_ENCERRADAS'
  | 'EM_ANDAMENTO'
  | 'FINALIZADO'
  | 'CANCELADO';

export type EventLocation = {
  venue: string | null;
  address: string | null;
  municipality: string | null;
  state: string | null;
};

export type EventCertificateSettings = {
  enabled: boolean;
  workloadMinutes: number | null;
  requiresPresence: boolean;
  text: string | null;
  templateId: string | null;
};

export type EventPaymentSettings = {
  reservationDurationMinutes: number | null;
  allowedMethods: PaymentMethod[];
  maxInstallments: number;
};

export type EventSpeaker = {
  id: string;
  name: string;
  biography: string | null;
};

export type EventAgendaItem = {
  id: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  speakerIds: string[];
  room: string | null;
};
