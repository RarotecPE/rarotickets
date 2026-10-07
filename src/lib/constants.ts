export const APP = { name: "RaroTickets", description: "Gestão e comercialização de eventos RaroTickets." };

export type Tone = "primary" | "success" | "warning" | "danger" | "muted";

export const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  aguardando_pagamento: "Aguardando pagamento",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  lista_espera: "Lista de espera",
};

export const EVENT_STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  agendado: "Agendado",
  inscricoes_abertas: "Inscrições abertas",
  inscricoes_encerradas: "Inscrições encerradas",
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};
