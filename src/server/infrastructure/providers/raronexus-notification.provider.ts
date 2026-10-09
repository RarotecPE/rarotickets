import "server-only";
import type { DeliverNotificationParams } from "@/modules/ticketing/domain/services/notification-provider.interface";
import { readEnvironment } from "@/server/config/environment.config";
import { NotificationProvider } from "./notification-provider.base";
import { RaroNexusEmailClient } from "@/server/infrastructure/clients/raronexus-email.client";

export class RaroNexusNotificationProvider extends NotificationProvider {
  private readonly client: RaroNexusEmailClient;

  constructor(client?: RaroNexusEmailClient) {
    super();
    this.client = client ?? new RaroNexusEmailClient();
  }

  async send(params: DeliverNotificationParams): Promise<void> {
    const environment = readEnvironment();
    const body = renderEmailBody({
      message: params.message,
      timeZone: environment.appTimezone,
    });

    const code = readPayloadText(params.message.payload, "registrationCode");

    await this.client.send({
      to: params.message.recipient,
      subject: params.message.subject,
      body,
      endpoint: environment.raroNexusEmailEndpoint || undefined,
      metadata: {
        outboxId: params.message.id,
        template: params.message.template,
        channel: params.message.channel,
        registrationCode: code || undefined,
      },
    });
  }
}

type RenderBodyParams = {
  message: DeliverNotificationParams["message"];
  timeZone: string;
};

function renderEmailBody(params: RenderBodyParams): string {
  const message = params.message;
  const name = readPayloadText(message.payload, "name") || "participante";
  const eventTitle = readPayloadText(message.payload, "eventTitle") || "seu evento";
  const code = readPayloadText(message.payload, "registrationCode");
  const participantUrl = readPayloadText(message.payload, "participantUrl");
  const checkoutUrl = readPayloadText(message.payload, "checkoutUrl");
  const isWaitlist = message.template === "waitlist";
  const isWaitlistPromotion = message.template === "waitlist-promoted";
  const isConfirmed = message.template === "registration-confirmed";
  const deadline = formatDeadline({
    value: readPayloadText(message.payload, "waitlistExpiresAt"),
    timeZone: params.timeZone,
  });
  const actionUrl = checkoutUrl || participantUrl;
  const actionLabel = checkoutUrl
    ? "Continuar para o pagamento"
    : "Acessar minha inscrição";
  const messageLine = isWaitlistPromotion
    ? `Uma vaga foi liberada para você. Conclua o pagamento${deadline ? ` até ${deadline}` : " em até 24 horas"}.`
    : isWaitlist
      ? "Sua inscrição está registrada na lista de espera. Avisaremos por este canal quando surgir uma vaga."
      : isConfirmed
        ? "Sua presença está garantida. Guarde este e-mail e consulte sua credencial na área do participante."
        : "Sua vaga está reservada por 15 minutos. Conclua o pagamento para confirmar a inscrição.";
  const deadlineHtml =
    isWaitlistPromotion && deadline
      ? `<p style="margin:8px 0 0 0"><strong>Prazo para pagamento:</strong> ${escapeHtml(deadline)}</p>`
      : "";

  return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#e2e8f0"><p style="margin:0 0 12px 0;font-size:16px">Olá, <strong>${escapeHtml(name)}</strong>.</p><p style="margin:0 0 16px 0">${escapeHtml(messageLine)}</p><div style="margin:20px 0;padding:16px;background:#1a2236;border:1px solid #2d3748;border-radius:8px"><p style="margin:0 0 8px 0;font-size:15px;font-weight:bold;color:#60a5fa">${escapeHtml(eventTitle)}</p>${code ? `<p style="margin:0 0 4px 0">Código da inscrição: <strong>${escapeHtml(code)}</strong></p>` : ""}${deadlineHtml}</div>${actionUrl ? `<p style="margin:20px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${escapeHtml(actionLabel)}</a></p>` : ""}<p style="margin:20px 0 0 0;font-size:12px;color:#94a3b8">Se você não solicitou esta inscrição, ignore esta mensagem.</p></div>`;
}

function readPayloadText(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === "string" ? value : "";
}

function formatDeadline(params: { value: string; timeZone: string }): string {
  if (!params.value) return "";
  const date = new Date(params.value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: params.timeZone,
  }).format(date);
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

