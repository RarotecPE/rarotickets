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
  maxAttempts?: number;
  baseDelayMs?: number;
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

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 600;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableEmailError(
  status: number | null,
  code?: string,
  message?: string,
): boolean {
  if (status === null) return true;

  if (status === 408 || status === 429 || status >= 500) {
    return true;
  }

  const combined = `${code ?? ""} ${message ?? ""}`.toLowerCase();
  if (
    code === "EMAIL_SEND_FAILED" ||
    code === "RATE_LIMITED" ||
    /\b4\d{2}\b/.test(combined) ||
    combined.includes("queue file write error") ||
    combined.includes("try again") ||
    combined.includes("temporary") ||
    combined.includes("timeout")
  ) {
    return true;
  }

  return false;
}

export class RaroNexusEmailClient {
  private readonly baseUrl?: string;
  private readonly clientId?: string;
  private readonly clientSecret?: string;
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;

  constructor(dependencies?: RaroNexusEmailClientDependencies) {
    this.baseUrl = dependencies?.baseUrl;
    this.clientId = dependencies?.clientId;
    this.clientSecret = dependencies?.clientSecret;
    this.maxAttempts = dependencies?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.baseDelayMs = dependencies?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
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

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      let response: Response | null = null;
      let data: NexusEmailEnvelope | null = null;

      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-RaroNexus-Client-Id": clientId,
            "X-RaroNexus-Client-Secret": clientSecret,
          },
          body: JSON.stringify(payload),
        });

        data = (await response.json().catch(() => null)) as NexusEmailEnvelope | null;
      } catch (networkError) {
        const message = networkError instanceof Error ? networkError.message : String(networkError);
        lastError = new Error(`[RaroNexus Email Error] [NETWORK_ERROR] ${message}`);

        if (attempt < this.maxAttempts) {
          const delay = this.baseDelayMs * Math.pow(2, attempt - 1);
          if (delay > 0) await sleep(delay);
          continue;
        }
        throw lastError;
      }

      if (response.ok && data?.success) {
        return {
          sent: data.data.sent,
          messageId: data.data.message_id ?? null,
        };
      }

      const errorCode = (data && !data.success && data.code) || `HTTP_${response.status}`;
      const errorMessage =
        (data && !data.success && data.message) || `Falha na requisição HTTP: status ${response.status}`;
      lastError = new Error(`[RaroNexus Email Error] [${errorCode}] ${errorMessage}`);

      const canRetry =
        attempt < this.maxAttempts &&
        isRetryableEmailError(response.status, errorCode, errorMessage);

      if (!canRetry) {
        throw lastError;
      }

      const delay = this.baseDelayMs * Math.pow(2, attempt - 1);
      if (delay > 0) await sleep(delay);
    }

    throw lastError ?? new Error("[RaroNexus Email Error] [UNKNOWN_ERROR] Falha ao enviar e-mail.");
  }
}

export async function sendRaroNexusEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const client = new RaroNexusEmailClient();
  return client.send(options);
}

