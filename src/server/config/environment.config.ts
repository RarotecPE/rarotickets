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
  raroNexusBaseUrl: string;
  raroNexusClientId: string;
  raroNexusClientSecret: string;
  raroNexusRoleKeys: RoleEnvironmentKeys;
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
  storageDriver: "local" | "s3";
  storageLocalDirectory: string;
  s3Endpoint: string;
  s3Region: string;
  s3Bucket: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3PublicBaseUrl: string;
};

export function readEnvironment(): ApplicationEnvironment {
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
    raroNexusBaseUrl: clean(process.env.RARONEXUS_BASE_URL, ""),
    raroNexusClientId: process.env.RARONEXUS_CLIENT_ID ?? "",
    raroNexusClientSecret: process.env.RARONEXUS_CLIENT_SECRET ?? "",
    raroNexusRoleKeys: {
      administrador: process.env.RARONEXUS_ROLE_ADMIN ?? "administrador",
      gerente_evento: process.env.RARONEXUS_ROLE_EVENT_MANAGER ?? "gerente_evento",
      financeiro: process.env.RARONEXUS_ROLE_FINANCE ?? "financeiro",
      atendimento: process.env.RARONEXUS_ROLE_SUPPORT ?? "atendimento",
      checkin: process.env.RARONEXUS_ROLE_CHECKIN ?? "checkin",
      consulta: process.env.RARONEXUS_ROLE_READONLY ?? "consulta",
    },
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
    storageDriver: process.env.STORAGE_DRIVER === "s3" ? "s3" : "local",
    storageLocalDirectory: process.env.STORAGE_LOCAL_DIRECTORY ?? ".data/uploads",
    s3Endpoint: process.env.S3_ENDPOINT ?? "",
    s3Region: process.env.S3_REGION ?? "sa-east-1",
    s3Bucket: process.env.S3_BUCKET ?? "",
    s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? "",
  };
}

export function isPlaceholder(value: string): boolean {
  return !value || /^\[.+\]$/.test(value.trim());
}

export function isRaroNexusConfigured(): boolean {
  const environment = readEnvironment();
  return [environment.raroNexusBaseUrl, environment.raroNexusClientId, environment.raroNexusClientSecret]
    .every((value) => !isPlaceholder(value));
}

function parsePort(value: string | undefined, fallback: number): number {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 ? port : fallback;
}

function clean(value: string | undefined, fallback: string): string {
  return (value ?? fallback).trim().replace(/\/$/, "");
}
