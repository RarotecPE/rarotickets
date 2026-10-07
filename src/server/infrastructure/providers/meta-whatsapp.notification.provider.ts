import "server-only";
import { NotificationProvider } from "./notification-provider.base";
import type { DeliverNotificationParams } from "@/modules/ticketing/domain/services/notification-provider.interface";
import { readEnvironment } from "@/server/config/environment.config";

type WhatsAppTextParameter = { type: "text"; text: string };

export class MetaWhatsAppNotificationProvider extends NotificationProvider {
  async send(params: DeliverNotificationParams): Promise<void> {
    const environment = readEnvironment();
    const isWaitlistPromotion = params.message.template === "waitlist-promoted";
    const templateName = isWaitlistPromotion
      ? environment.whatsappWaitlistTemplateName
      : environment.whatsappTemplateName;
    if (
      !environment.whatsappPhoneNumberId ||
      !environment.whatsappAccessToken ||
      !templateName
    ) {
      throw new Error("WhatsApp Cloud API ainda não está configurada.");
    }

    const parameters: WhatsAppTextParameter[] = [
      {
        type: "text",
        text: payloadText(params.message.payload, "name", "participante"),
      },
      {
        type: "text",
        text: payloadText(params.message.payload, "eventTitle", "evento"),
      },
      {
        type: "text",
        text: payloadText(params.message.payload, "registrationCode", "—"),
      },
      {
        type: "text",
        text: payloadText(params.message.payload, "participantUrl", ""),
      },
    ];
    if (isWaitlistPromotion) {
      parameters.push({
        type: "text",
        text: formatDeadline({
          value: payloadText(params.message.payload, "waitlistExpiresAt", ""),
          timeZone: environment.appTimezone,
        }),
      });
    }

    const response = await fetch(
      `${environment.whatsappApiBaseUrl}/${environment.whatsappPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${environment.whatsappAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: params.message.recipient.replace(/\D/g, ""),
          type: "template",
          template: {
            name: templateName,
            language: { code: environment.whatsappTemplateLanguage },
            components: [{ type: "body", parameters }],
          },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!response.ok) {
      throw new Error(
        `A Meta Cloud API não aceitou a mensagem (HTTP ${response.status}).`,
      );
    }
  }
}

function payloadText(
  payload: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const value = payload[key];
  return typeof value === "string" && value ? value : fallback;
}

function formatDeadline(params: { value: string; timeZone: string }): string {
  if (!params.value) return "em até 24 horas";
  const date = new Date(params.value);
  if (Number.isNaN(date.getTime())) return "em até 24 horas";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: params.timeZone,
  }).format(date);
}
