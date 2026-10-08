import "server-only";
import { readEnvironment } from "@/server/config/environment.config";

export interface SendEmailAttachment {
  filename: string;
  contentType: string;
  contentBase64: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject?: string;
  body: string;
  endpoint?: string;
  attachments?: SendEmailAttachment[];
  metadata?: Record<string, unknown>;
}

export interface SendEmailResult {
  sent: boolean;
  messageId: string | null;
}

export type RaroNexusEmailClientDependencies = {
  baseUrl?: string;
  clientId?: string;
  clientSecret?: string;
};

type NexusEmailSuccessEnvelope = {
  success: true;
  data: {
    sent: boolean;
    message_id?: string | null;
  };
};

type NexusEmailErrorEnvelope = {
  success: false;
  message?: string;
  code?: string;
};

type NexusEmailEnvelope = NexusEmailSuccessEnvelope | NexusEmailErrorEnvelope;

export class RaroNexusEmailClient {
  private readonly baseUrl?: string;
  private readonly clientId?: string;
  private readonly clientSecret?: string;

  constructor(dependencies?: RaroNexusEmailClientDependencies) {
    this.baseUrl = dependencies?.baseUrl;
    this.clientId = dependencies?.clientId;
    this.clientSecret = dependencies?.clientSecret;
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const environment = readEnvironment();
    const baseUrl = (this.baseUrl || environment.raroNexusApiUrl || environment.raroNexusBaseUrl).replace(/\/$/, "");
    const clientId = this.clientId || environment.raroNexusClientId;
    const clientSecret = this.clientSecret || environment.raroNexusClientSecret;

    if (!baseUrl || !clientId || !clientSecret) {
      throw new Error(
        "Configurações do RaroNexus ausentes. Defina RARONEXUS_API_URL, RARONEXUS_CLIENT_ID e RARONEXUS_CLIENT_SECRET."
      );
    }

    const endpointPath = options.endpoint
      ? `/api/email/${encodeURIComponent(options.endpoint)}`
      : "/api/email/send";

    const url = `${baseUrl}${endpointPath}`;

    const cleanSubject = options.subject
      ? options.subject.replace(/<[^>]*>/g, "").trim().slice(0, 160)
      : undefined;

    const payload = {
      to: options.to,
      subject: cleanSubject,
      body: options.body,
      attachments: options.attachments?.map((att) => ({
        filename: att.filename,
        content_type: att.contentType,
        content_base64: att.contentBase64,
      })),
      metadata: options.metadata,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RaroNexus-Client-Id": clientId,
        "X-RaroNexus-Client-Secret": clientSecret,
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => null)) as NexusEmailEnvelope | null;

    if (!response.ok || !data?.success) {
      const errorCode = (data && !data.success && data.code) || `HTTP_${response.status}`;
      const errorMessage =
        (data && !data.success && data.message) || `Falha na requisição HTTP: status ${response.status}`;
      throw new Error(`[RaroNexus Email Error] [${errorCode}] ${errorMessage}`);
    }

    return {
      sent: data.data.sent,
      messageId: data.data.message_id ?? null,
    };
  }
}

export async function sendRaroNexusEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const client = new RaroNexusEmailClient();
  return client.send(options);
}

