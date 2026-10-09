import "server-only";
import { RaroNexusEmailClient } from "../clients/raronexus-email.client";
import { readEnvironment } from "@/server/config/environment.config";
import type { IParticipantEmailSender } from "@/modules/ticketing/domain/services/participant-email-sender.interface";

export class ParticipantEmailProvider implements IParticipantEmailSender {
  private readonly emailClient: RaroNexusEmailClient;

  constructor(emailClient?: RaroNexusEmailClient) {
    this.emailClient = emailClient ?? new RaroNexusEmailClient();
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
}

