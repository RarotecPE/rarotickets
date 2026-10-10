import "server-only";
import QRCode from "qrcode";
import { RaroNexusEmailClient } from "../clients/raronexus-email.client";
import { getFileStorageProvider } from "./file-storage-provider.factory";
import { readEnvironment } from "@/server/config/environment.config";
import type { IFileStorageProvider } from "@/modules/ticketing/domain/services/file-storage-provider.interface";
import type {
  IParticipantEmailSender,
  SendPaymentConfirmedEmailParams,
} from "@/modules/ticketing/domain/services/participant-email-sender.interface";

export class ParticipantEmailProvider implements IParticipantEmailSender {
  private readonly emailClient: RaroNexusEmailClient;
  private readonly fileStorageProvider: IFileStorageProvider;

  constructor(
    emailClient?: RaroNexusEmailClient,
    fileStorageProvider?: IFileStorageProvider,
  ) {
    this.emailClient = emailClient ?? new RaroNexusEmailClient();
    this.fileStorageProvider = fileStorageProvider ?? getFileStorageProvider();
  }

  async sendActivationEmail(params: { email: string; activationUrl: string }): Promise<void> {
    const env = readEnvironment();
    const endpoint = env.raroNexusEmailEndpointParticipantActivation || "ativacao-participante";
    const bodyHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111827;">Conclua seu cadastro no RaroTickets</h2>
        <p style="color: #4b5563; line-height: 1.5;">Você solicitou o cadastro no RaroTickets. Clique no botão abaixo para definir sua senha e completar seus dados de participante:</p>
        <div style="margin: 32px 0;">
          <a href="${params.activationUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
            Completar Meu Cadastro
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Ou copie e cole o link a seguir no seu navegador:</p>
        <p style="color: #2563eb; font-size: 13px; word-break: break-all;">${params.activationUrl}</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">Este link é válido por 24 horas. Se você não solicitou este cadastro, desconsidere esta mensagem.</p>
      </div>
    `.trim();

    try {
      await this.emailClient.send({
        to: params.email,
        subject: "Ativação de cadastro no RaroTickets",
        body: bodyHtml,
        endpoint,
      });
    } catch (error) {
      // Log failure but don't crash if in dev or if RaroNexus mock/local
      console.warn("[ParticipantEmailProvider] Falha ao enviar e-mail de ativação via RaroNexus:", error);
    }
  }

  async sendOtpEmail(params: { email: string; code: string }): Promise<void> {
    const env = readEnvironment();
    const endpoint = env.raroNexusEmailEndpointParticipantOtp || "codigo-login-participante";
    const bodyHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111827;">Seu código de acesso ao RaroTickets</h2>
        <p style="color: #4b5563; line-height: 1.5;">Utilize o código de confirmação abaixo para acessar sua conta de participante:</p>
        <div style="margin: 28px 0; text-align: center;">
          <div style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 16px 32px; background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937;">
            ${params.code}
          </div>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Este código é válido por 15 minutos.</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">Se você não solicitou este código, ignore este e-mail.</p>
      </div>
    `.trim();

    try {
      await this.emailClient.send({
        to: params.email,
        subject: `Código de acesso: ${params.code} · RaroTickets`,
        body: bodyHtml,
        endpoint,
      });
    } catch (error) {
      console.warn("[ParticipantEmailProvider] Falha ao enviar código de acesso via RaroNexus:", error);
    }
  }

  async sendPaymentConfirmedEmail(params: SendPaymentConfirmedEmailParams): Promise<void> {
    const env = readEnvironment();
    const endpoint =
      env.raroNexusEmailEndpointPaymentConfirmed || "confirmacao-pagamento-participante";
    const timeZone = env.appTimezone || "America/Sao_Paulo";

    let qrBase64 = "";
    let qrPublicUrl = "";
    try {
      const qrBuffer = await QRCode.toBuffer(params.qrPayload, {
        type: "png",
        width: 280,
        margin: 2,
        errorCorrectionLevel: "M",
      });
      qrBase64 = qrBuffer.toString("base64");

      const safeCode = params.registrationCode.replace(/[^a-zA-Z0-9_-]/g, "_");
      const storageKey = `public/credentials/qr-${safeCode}.png`;
      qrPublicUrl = await this.fileStorageProvider.storePublic({
        key: storageKey,
        contentType: "image/png",
        content: new Uint8Array(qrBuffer),
        preferExternalUrl: true,
      });
    } catch (qrError) {
      console.warn(
        "[ParticipantEmailProvider] Falha ao gerar ou armazenar imagem do QR Code no storage:",
        qrError,
      );
    }

    const qrDataUrl = qrBase64 ? `data:image/png;base64,${qrBase64}` : "";
    const qrImageSrc = qrPublicUrl || qrDataUrl;
    const formattedEventDate = formatDateTime(params.eventStartAt, timeZone);
    const formattedPaidAt = formatDateTime(params.paidAt ?? new Date(), timeZone);
    const formattedFinalAmount = formatCurrencyFromCents(params.finalCents);
    const formattedOriginalAmount =
      typeof params.originalCents === "number"
        ? formatCurrencyFromCents(params.originalCents)
        : formattedFinalAmount;
    const hasDiscount = typeof params.discountCents === "number" && params.discountCents > 0;
    const formattedDiscount = hasDiscount
      ? formatCurrencyFromCents(params.discountCents!)
      : null;
    const providerLabel =
      params.paymentProvider === "pagbank"
        ? "PagBank"
        : params.paymentProvider === "mock"
          ? "Pagamento Simulado"
          : "Online";
    const modalityLabel =
      params.modality === "online"
        ? "Online"
        : params.modality === "hibrido"
          ? "Híbrido"
          : "Presencial";

    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111827; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
        <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px;">
          <span style="display: inline-block; background-color: #dcfce7; color: #166534; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">
            Pagamento Confirmado
          </span>
          <h2 style="color: #111827; margin: 12px 0 4px 0; font-size: 22px;">Sua inscrição está confirmada!</h2>
          <p style="color: #4b5563; margin: 0; font-size: 15px;">
            Olá, <strong>${escapeHtml(params.participantName)}</strong>. Recebemos a confirmação do seu pagamento para o evento <strong>${escapeHtml(params.eventTitle)}</strong>.
          </p>
        </div>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #1f2937; text-transform: uppercase; letter-spacing: 0.5px;">Dados da Inscrição e do Evento</h3>
          <p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>Evento:</strong> ${escapeHtml(params.eventTitle)}</p>
          <p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>Código da inscrição:</strong> <span style="font-family: monospace; font-weight: bold; color: #111827;">${escapeHtml(params.registrationCode)}</span></p>
          ${params.lotName ? `<p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>Lote:</strong> ${escapeHtml(params.lotName)}</p>` : ""}
          <p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>Data e horário:</strong> ${escapeHtml(formattedEventDate)}</p>
          <p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>Modalidade:</strong> ${escapeHtml(modalityLabel)}</p>
          ${params.location ? `<p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>Local:</strong> ${escapeHtml(params.location)}</p>` : ""}
          ${params.onlineUrl ? `<p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>Link de transmissão:</strong> <a href="${sanitizeUrlAttribute(params.onlineUrl)}" style="color: #2563eb;">${escapeHtml(params.onlineUrl)}</a></p>` : ""}
        </div>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #1f2937; text-transform: uppercase; letter-spacing: 0.5px;">Dados do Pagamento</h3>
          <p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>Status:</strong> Confirmado (Pago)</p>
          ${hasDiscount ? `<p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>Valor original:</strong> ${escapeHtml(formattedOriginalAmount)}</p><p style="margin: 6px 0; font-size: 14px; color: #166534;"><strong>Desconto aplicado:</strong> - ${escapeHtml(formattedDiscount!)}</p>` : ""}
          <p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>Valor pago:</strong> <strong style="color: #111827;">${escapeHtml(formattedFinalAmount)}</strong></p>
          <p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>Processador:</strong> ${escapeHtml(providerLabel)}</p>
          ${params.paymentExternalId ? `<p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>ID da transação:</strong> <span style="font-family: monospace;">${escapeHtml(params.paymentExternalId)}</span></p>` : ""}
          <p style="margin: 6px 0; font-size: 14px; color: #374151;"><strong>Confirmado em:</strong> ${escapeHtml(formattedPaidAt)}</p>
        </div>

        <div style="text-align: center; background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #0f172a;">Sua Credencial de Acesso (QR Code)</h3>
          <p style="margin: 0 0 16px 0; font-size: 13px; color: #475569;">Apresente este QR Code na recepção para realizar o check-in no evento:</p>
          ${
            qrImageSrc
              ? `<div style="display: inline-block; padding: 12px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
                  <img src="${sanitizeUrlAttribute(qrImageSrc)}" alt="QR Code da Credencial ${escapeHtml(params.registrationCode)}" width="220" height="220" style="display: block; margin: 0 auto;" />
                </div>`
              : ""
          }
          <p style="margin: 12px 0 0 0; font-family: monospace; font-size: 14px; font-weight: bold; color: #1e293b;">
            ${escapeHtml(params.registrationCode)}
          </p>
          <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b;">
            O arquivo da credencial também segue anexado neste e-mail.
          </p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${sanitizeUrlAttribute(params.participantUrl)}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            Acessar Ingresso e QR Code Online
          </a>
        </div>

        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
          Guarde este comprovante. Você também pode acessar seus ingressos a qualquer momento na área do participante.
        </p>
      </div>
    `.trim();

    try {
      await this.emailClient.send({
        to: params.email,
        subject: `Pagamento confirmado: ${params.eventTitle} (${params.registrationCode})`,
        body: bodyHtml,
        endpoint,
        attachments: qrBase64
          ? [
              {
                filename: `credencial-${params.registrationCode}.png`,
                contentType: "image/png",
                contentBase64: qrBase64,
              },
            ]
          : undefined,
        metadata: {
          registrationCode: params.registrationCode,
          participantName: params.participantName,
          eventTitle: params.eventTitle,
          eventStartAt: params.eventStartAt.toISOString(),
          lotName: params.lotName ?? null,
          originalCents: params.originalCents ?? params.finalCents,
          discountCents: params.discountCents ?? 0,
          finalCents: params.finalCents,
          formattedAmount: formattedFinalAmount,
          paymentProvider: params.paymentProvider ?? null,
          paymentExternalId: params.paymentExternalId ?? null,
          paidAt: (params.paidAt ?? new Date()).toISOString(),
          participantUrl: params.participantUrl,
          qrPayload: params.qrPayload,
          qrCodeUrl: qrPublicUrl || null,
          qrCodeDataUrl: qrDataUrl || null,
        },
      });
    } catch (error) {
      console.warn(
        "[ParticipantEmailProvider] Falha ao enviar e-mail de confirmação de pagamento via RaroNexus:",
        error,
      );
    }
  }
}

function formatDateTime(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function formatCurrencyFromCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents || 0) / 100);
}

function sanitizeUrlAttribute(value: string): string {
  return value.replace(/["'<>]/g, "").trim();
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
