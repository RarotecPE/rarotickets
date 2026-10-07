/**
 * Configuração centralizada de variáveis de ambiente.
 * Este arquivo é carregado APENAS no servidor.
 */
function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    // Não lança em import-time para permitir build sem .env.
    // Valores vazios disparam o modo mock dos adapters (PagBank e RaroNexus).
    return "";
  }
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  appBaseUrl: required("APP_BASE_URL", "http://localhost:3000"),
  databaseUrl: required(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/rarotickets",
  ),
  raronexus: {
    baseUrl: required("RARONEXUS_BASE_URL", "http://localhost:3001"),
    clientId: required("RARONEXUS_CLIENT_ID", "rarotickets"),
    clientSecret: required("RARONEXUS_CLIENT_SECRET", "dev-secret"),
  },
  pagbank: {
    env: (process.env.PAGBANK_ENV as "sandbox" | "production") ?? "sandbox",
    baseUrl: required("PAGBANK_BASE_URL", "https://sandbox.api.pagseguro.com"),
    token: required("PAGBANK_TOKEN", ""),
    publicKey: process.env.PAGBANK_PUBLIC_KEY ?? "",
    webhookSecret: process.env.PAGBANK_WEBHOOK_SECRET ?? "",
  },
  session: {
    secret: required("APP_SESSION_SECRET", "dev-session-secret-change-me-please-32bytes-minimum"),
    days: Number(process.env.APP_SESSION_DAYS ?? "7"),
  },
} as const;
