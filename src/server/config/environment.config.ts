export type RoleEnvironmentKeys = {
  administrador: string;
  gerente_evento: string;
  financeiro: string;
  atendimento: string;
  checkin: string;
  consulta: string;
};

export type ApplicationEnvironment = {
  nodeEnvironment: string;
  appBaseUrl: string;
  appTimezone: string;
  databaseUrl: string;
  appSecretKey: string;
  qrSigningSecret: string;
  cronSecret: string;
  paymentGateway: "mock" | "pagbank";
  pagBankEnvironment: "sandbox" | "production";
  pagBankBaseUrl: string;
  pagBankToken: string;
  pagBankPublicKey: string;
  pagBankWebhookSecret: string;
  raroNexusApiUrl: string;
  raroNexusBaseUrl: string;
  raroNexusClientId: string;
  raroNexusClientSecret: string;
  raroNexusSessionToken: string;
  raroNexusEmailEndpoint: string;
  raroNexusEmailEndpointParticipantActivation: string;
  raroNexusEmailEndpointParticipantOtp: string;
  raroNexusEmailEndpointPaymentConfirmed: string;
  raroNexusEmailEndpointWaitlistPromoted: string;
  raroNexusRoleKeys: RoleEnvironmentKeys;
  emailProvider: "raronexus" | "smtp";
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  smtpFrom: string;
  whatsappApiBaseUrl: string;
  whatsappPhoneNumberId: string;
  whatsappAccessToken: string;
  whatsappTemplateName: string;
  whatsappWaitlistTemplateName: string;
  whatsappTemplateLanguage: string;
  storageDriver: "local" | "s3" | "r2";
  storageLocalDirectory: string;
  storageKeyPrefix: string;
  publicStorageBaseUrl: string;
  r2Endpoint: string;
  r2Bucket: string;
  r2ProjectFolder: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2BasePrefix: string;
  s3Endpoint: string;
  s3Region: string;
  s3Bucket: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3PublicBaseUrl: string;
};

export function readEnvironment(): ApplicationEnvironment {
  const rawNexusUrl = process.env.RARONEXUS_API_URL || process.env.RARONEXUS_BASE_URL;
  const raroNexusApiUrl = clean(rawNexusUrl, "");
  const emailProviderEnv = process.env.EMAIL_PROVIDER?.toLowerCase().trim();
  const emailProvider: "raronexus" | "smtp" = emailProviderEnv === "smtp" ? "smtp" : "raronexus";

  return {
    nodeEnvironment: process.env.NODE_ENV ?? "development",
    appBaseUrl: clean(process.env.APP_BASE_URL, "http://localhost:3000"),
    appTimezone: process.env.APP_TIMEZONE ?? "America/Sao_Paulo",
    databaseUrl: process.env.DATABASE_URL ?? "",
    appSecretKey: process.env.APP_SECRET_KEY ?? "",
    qrSigningSecret: process.env.QR_SIGNING_SECRET ?? "",
    cronSecret: process.env.CRON_SECRET ?? "",
    paymentGateway: process.env.PAYMENT_GATEWAY === "pagbank" ? "pagbank" : "mock",
    pagBankEnvironment: process.env.PAGBANK_ENV === "production" ? "production" : "sandbox",
    pagBankBaseUrl: clean(process.env.PAGBANK_BASE_URL, "https://sandbox.api.pagseguro.com"),
    pagBankToken: process.env.PAGBANK_TOKEN ?? "",
    pagBankPublicKey: process.env.PAGBANK_PUBLIC_KEY ?? "",
    pagBankWebhookSecret: process.env.PAGBANK_WEBHOOK_SECRET ?? "",
    raroNexusApiUrl,
    raroNexusBaseUrl: raroNexusApiUrl,
    raroNexusClientId: process.env.RARONEXUS_CLIENT_ID ?? "",
    raroNexusClientSecret: process.env.RARONEXUS_CLIENT_SECRET ?? "",
    raroNexusSessionToken: process.env.RARONEXUS_SESSION_TOKEN ?? "",
    raroNexusEmailEndpoint: process.env.RARONEXUS_EMAIL_ENDPOINT ?? "",
    raroNexusEmailEndpointParticipantActivation:
      process.env.RARONEXUS_EMAIL_ENDPOINT_PARTICIPANT_ACTIVATION ?? "ativacao-participante",
    raroNexusEmailEndpointParticipantOtp:
      process.env.RARONEXUS_EMAIL_ENDPOINT_PARTICIPANT_OTP ?? "codigo-login-participante",
    raroNexusEmailEndpointPaymentConfirmed:
      process.env.RARONEXUS_EMAIL_ENDPOINT_PAYMENT_CONFIRMED ?? "confirmacao-pagamento-participante",
    raroNexusEmailEndpointWaitlistPromoted:
      process.env.RARONEXUS_EMAIL_ENDPOINT_WAITLIST_PROMOTED ??
      process.env.RARONEXUS_EMAIL_ENDPOINT_PAYMENT_CONFIRMED ??
      "confirmacao-pagamento-participante",
    raroNexusRoleKeys: {
      administrador: process.env.RARONEXUS_ROLE_ADMIN ?? "administrador",
      gerente_evento: process.env.RARONEXUS_ROLE_EVENT_MANAGER ?? "gerente_evento",
      financeiro: process.env.RARONEXUS_ROLE_FINANCE ?? "financeiro",
      atendimento: process.env.RARONEXUS_ROLE_SUPPORT ?? "atendimento",
      checkin: process.env.RARONEXUS_ROLE_CHECKIN ?? "checkin",
      consulta: process.env.RARONEXUS_ROLE_READONLY ?? "consulta",
    },
    emailProvider,
    smtpHost: process.env.SMTP_HOST ?? "",
    smtpPort: parsePort(process.env.SMTP_PORT, 587),
    smtpSecure: process.env.SMTP_SECURE === "true",
    smtpUser: process.env.SMTP_USER ?? "",
    smtpPassword: process.env.SMTP_PASSWORD ?? "",
    smtpFrom: process.env.SMTP_FROM ?? "RaroTickets <nao-responda@localhost>",
    whatsappApiBaseUrl: clean(process.env.WHATSAPP_API_BASE_URL, "https://graph.facebook.com/v21.0"),
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
    whatsappTemplateName: process.env.WHATSAPP_TEMPLATE_NAME ?? "",
    whatsappWaitlistTemplateName:
      process.env.WHATSAPP_WAITLIST_TEMPLATE_NAME ?? "",
    whatsappTemplateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "pt_BR",
    ...parseStorageEnvironment(),
  };
}

function parseStorageEnvironment() {
  const rawStorageDriver = cleanString(process.env.STORAGE_DRIVER).toLowerCase();
  const r2Endpoint = cleanString(process.env.R2_ENDPOINT);
  const r2Bucket = cleanString(process.env.R2_BUCKET);
  const r2ProjectFolder = cleanString(
    process.env.R2_PROJECT_FOLDER || process.env.R2_FOLDER,
  );
  const r2AccessKeyId = cleanString(process.env.R2_ACCESS_KEY_ID);
  const r2SecretAccessKey = cleanString(process.env.R2_SECRET_ACCESS_KEY);
  const r2BasePrefix = cleanString(process.env.R2_BASE_PREFIX);

  const s3Endpoint = cleanString(process.env.S3_ENDPOINT);
  const s3Region = cleanString(process.env.S3_REGION, "sa-east-1");
  const s3Bucket = cleanString(process.env.S3_BUCKET);
  const s3AccessKeyId = cleanString(process.env.S3_ACCESS_KEY_ID);
  const s3SecretAccessKey = cleanString(process.env.S3_SECRET_ACCESS_KEY);
  const s3PublicBaseUrl = cleanString(process.env.S3_PUBLIC_BASE_URL);

  const hasR2 = Boolean(r2Bucket || r2Endpoint);
  const hasS3 = Boolean(s3Bucket || s3Endpoint);

  let storageDriver: "local" | "s3" | "r2";
  if (rawStorageDriver === "r2") {
    storageDriver = "r2";
  } else if (rawStorageDriver === "s3") {
    storageDriver = "s3";
  } else if (rawStorageDriver === "local") {
    storageDriver = "local";
  } else if (hasR2) {
    storageDriver = "r2";
  } else if (hasS3) {
    storageDriver = "s3";
  } else {
    storageDriver = "local";
  }

  const { keyPrefix: storageKeyPrefix, publicBaseUrl: publicStorageBaseUrl } =
    parseStoragePrefix(r2ProjectFolder, r2BasePrefix, s3PublicBaseUrl);

  let normalizedR2Endpoint = r2Endpoint.replace(/\/+$/, "");
  if (normalizedR2Endpoint && r2Bucket && normalizedR2Endpoint.endsWith(`/${r2Bucket}`)) {
    normalizedR2Endpoint = normalizedR2Endpoint.slice(0, -(r2Bucket.length + 1)).replace(/\/+$/, "");
  }

  return {
    storageDriver,
    storageLocalDirectory: cleanString(process.env.STORAGE_LOCAL_DIRECTORY, ".data/uploads"),
    storageKeyPrefix,
    publicStorageBaseUrl,
    r2Endpoint: normalizedR2Endpoint,
    r2Bucket,
    r2ProjectFolder,
    r2AccessKeyId,
    r2SecretAccessKey,
    r2BasePrefix,
    s3Endpoint,
    s3Region,
    s3Bucket,
    s3AccessKeyId,
    s3SecretAccessKey,
    s3PublicBaseUrl,
  };
}

function parseStoragePrefix(
  projectFolder: string,
  prefixRaw: string,
  publicUrlFallback: string,
): {
  keyPrefix: string;
  publicBaseUrl: string;
} {
  const cleanProjectFolder = projectFolder.trim().replace(/^\/+|\/+$/g, "");
  const trimmed = prefixRaw.trim();

  let keyPrefix = cleanProjectFolder;
  let publicBaseUrl = publicUrlFallback ? publicUrlFallback.replace(/\/+$/, "") : "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsedUrl = new URL(trimmed);
      const pathname = parsedUrl.pathname.replace(/^\/+|\/+$/g, "");
      publicBaseUrl = trimmed.replace(/\/+$/, "");
      if (!keyPrefix && pathname) {
        keyPrefix = pathname;
      }
    } catch {
      publicBaseUrl = trimmed.replace(/\/+$/, "");
    }
  } else if (trimmed && !keyPrefix) {
    keyPrefix = trimmed.replace(/^\/+|\/+$/g, "");
  }

  return {
    keyPrefix,
    publicBaseUrl,
  };
}

function cleanString(value: string | undefined, fallback = ""): string {
  if (!value) return fallback;
  let str = value.trim();
  if (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'"))
  ) {
    str = str.slice(1, -1).trim();
  }
  return str || fallback;
}

export function isPlaceholder(value: string): boolean {
  return !value || /^\[.+\]$/.test(value.trim());
}

export function isRaroNexusConfigured(): boolean {
  const environment = readEnvironment();
  return [environment.raroNexusApiUrl, environment.raroNexusClientId, environment.raroNexusClientSecret]
    .every((value) => !isPlaceholder(value));
}

export function isSmtpConfigured(): boolean {
  const environment = readEnvironment();
  return !isPlaceholder(environment.smtpHost);
}

function parsePort(value: string | undefined, fallback: number): number {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 ? port : fallback;
}

function clean(value: string | undefined, fallback: string): string {
  return (value ?? fallback).trim().replace(/\/$/, "");
}
