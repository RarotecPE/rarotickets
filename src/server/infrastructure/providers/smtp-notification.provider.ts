import "server-only";
import nodemailer from "nodemailer";
import type { DeliverNotificationParams } from "@/modules/ticketing/domain/services/notification-provider.interface";
import { readEnvironment } from "@/server/config/environment.config";
import { NotificationProvider } from "./notification-provider.base";

export class SmtpNotificationProvider extends NotificationProvider {
  async send(params: DeliverNotificationParams): Promise<void> {
    const environment = readEnvironment();
    if (!environment.smtpHost || environment.smtpHost.startsWith("[")) {
      throw new Error("SMTP ainda não está configurado.");
    }
    const transporter = nodemailer.createTransport({
      host: environment.smtpHost,
      port: environment.smtpPort,
      secure: environment.smtpSecure,
      auth: environment.smtpUser
        ? { user: environment.smtpUser, pass: environment.smtpPassword }
        : undefined,
    });
    const content = renderEmail({
      message: params.message,
      timeZone: environment.appTimezone,
    });
    await transporter.sendMail({
      from: environment.smtpFrom,
      to: params.message.recipient,
      subject: params.message.subject,
      html: content.html,
      text: content.text,
    });
  }
}

type RenderEmailParams = {
  message: DeliverNotificationParams["message"];
  timeZone: string;
};

function renderEmail(params: RenderEmailParams): { html: string; text: string } {
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
      ? `<p><strong>Prazo para pagamento:</strong> ${escapeHtml(deadline)}</p>`
      : "";
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#0b0f17;color:#e2e8f0;font-family:Arial,sans-serif"><main style="max-width:560px;margin:32px auto;padding:28px;background:#101726;border:1px solid #1e293b;border-radius:12px"><p style="color:#60a5fa;font-size:12px;font-weight:bold;letter-spacing:.12em">RAROTICKETS</p><h1 style="font-size:22px">${escapeHtml(message.subject)}</h1><p>Olá, ${escapeHtml(name)}.</p><p>${escapeHtml(messageLine)}</p><div style="margin:20px 0;padding:16px;background:#1a2236;border-radius:8px"><strong>${escapeHtml(eventTitle)}</strong>${code ? `<p>Código da inscrição: <strong>${escapeHtml(code)}</strong></p>` : ""}${deadlineHtml}</div>${actionUrl ? `<p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${escapeHtml(actionLabel)}</a></p>` : ""}<p style="color:#94a3b8;font-size:12px">Se você não solicitou esta inscrição, ignore esta mensagem.</p></main></body></html>`;
  const text = [
    message.subject,
    `Olá, ${name}.`,
    messageLine,
    deadline ? `Prazo para pagamento: ${deadline}` : "",
    eventTitle,
    code ? `Código da inscrição: ${code}` : "",
    actionUrl ? `${actionLabel}: ${actionUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return { html, text };
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
