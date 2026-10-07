export const APP = {
  name: "RaroTickets",
  description: "Gestão de eventos, inscrições e credenciamento",
} as const;

export type Tone = "primary" | "success" | "warning" | "danger" | "muted";

export const EVENT_STATUS_LABELS: Record<string, { label: string; tone: Tone }> = {
  RASCUNHO: { label: "Rascunho", tone: "muted" },
  AGENDADO: { label: "Agendado", tone: "primary" },
  INSCRICOES_ABERTAS: { label: "Inscrições abertas", tone: "success" },
  INSCRICOES_ENCERRADAS: { label: "Encerradas", tone: "warning" },
  EM_ANDAMENTO: { label: "Em andamento", tone: "primary" },
  FINALIZADO: { label: "Finalizado", tone: "muted" },
  CANCELADO: { label: "Cancelado", tone: "danger" },
};

export const REGISTRATION_STATUS_LABELS: Record<string, { label: string; tone: Tone }> = {
  PENDENTE: { label: "Pendente", tone: "warning" },
  AGUARDANDO_PAGAMENTO: { label: "Aguardando pagamento", tone: "primary" },
  CONFIRMADA: { label: "Confirmada", tone: "success" },
  CANCELADA: { label: "Cancelada", tone: "danger" },
  LISTA_ESPERA: { label: "Lista de espera", tone: "muted" },
};

export const MODALITY_LABELS: Record<string, string> = {
  PRESENCIAL: "Presencial",
  ONLINE: "Online",
};
