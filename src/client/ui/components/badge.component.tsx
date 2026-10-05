import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-app-surface-elevated text-app-muted border-app-border',
  primary: 'border-app-primary/40 text-app-primary bg-app-primary/10',
  success: 'border-app-success/40 text-app-success bg-app-success/10',
  warning: 'border-app-warning/40 text-app-warning bg-app-warning/10',
  danger: 'border-app-danger/40 text-app-danger bg-app-danger/10',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span
      className={`inline-flex items-center rounded-[999px] border px-2 py-0.5 text-[12px] font-medium whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

const EVENT_STATUS_LABELS: Record<string, { label: string; tone: BadgeTone }> = {
  RASCUNHO: { label: 'Rascunho', tone: 'neutral' },
  PUBLICADO: { label: 'Publicado', tone: 'primary' },
  INSCRICOES_ABERTAS: { label: 'Inscrições abertas', tone: 'success' },
  INSCRICOES_ENCERRADAS: { label: 'Inscrições encerradas', tone: 'warning' },
  EM_ANDAMENTO: { label: 'Em andamento', tone: 'primary' },
  FINALIZADO: { label: 'Finalizado', tone: 'neutral' },
  CANCELADO: { label: 'Cancelado', tone: 'danger' },
};

const REGISTRATION_STATUS_LABELS: Record<string, { label: string; tone: BadgeTone }> = {
  PENDENTE: { label: 'Pendente', tone: 'warning' },
  AGUARDANDO_PAGAMENTO: { label: 'Aguardando pagamento', tone: 'warning' },
  CONFIRMADA: { label: 'Confirmada', tone: 'success' },
  CANCELADA: { label: 'Cancelada', tone: 'danger' },
  LISTA_ESPERA: { label: 'Lista de espera', tone: 'primary' },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; tone: BadgeTone }> = {
  PENDENTE: { label: 'Pendente', tone: 'neutral' },
  AGUARDANDO: { label: 'Aguardando', tone: 'warning' },
  PAGO: { label: 'Pago', tone: 'success' },
  RECUSADO: { label: 'Recusado', tone: 'danger' },
  CANCELADO: { label: 'Cancelado', tone: 'danger' },
  EXPIRADO: { label: 'Expirado', tone: 'warning' },
  ESTORNADO: { label: 'Estornado', tone: 'primary' },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão de crédito',
  BOLETO: 'Boleto',
  CORTESIA: 'Cortesia',
};

const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: 'E-mail',
  WHATSAPP: 'WhatsApp',
};

export function EventStatusBadge({ status }: { status: string }) {
  const entry = EVENT_STATUS_LABELS[status] ?? { label: status, tone: 'neutral' as BadgeTone };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}

export function RegistrationStatusBadge({ status }: { status: string }) {
  const entry = REGISTRATION_STATUS_LABELS[status] ?? { label: status, tone: 'neutral' as BadgeTone };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const entry = PAYMENT_STATUS_LABELS[status] ?? { label: status, tone: 'neutral' as BadgeTone };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}

export function PaymentMethodBadge({ method }: { method: string }) {
  return <Badge>{PAYMENT_METHOD_LABELS[method] ?? method}</Badge>;
}

export function ChannelBadge({ channel }: { channel: string }) {
  return <Badge>{CHANNEL_LABELS[channel] ?? channel}</Badge>;
}
