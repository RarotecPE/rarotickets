import {
  assertProductionSecrets,
  readBoolean,
  readNumber,
  readOptionalString,
  readString,
  readNodeEnv,
} from './env.config';
import type { NodeEnvironment } from './env.config';

export type DatabaseConfig = {
  url: string;
  ssl: boolean;
  poolMax: number;
  autoMigrate: boolean;
  autoSeed: boolean;
  embedded: boolean;
  embeddedPort: number;
  embeddedDataDir: string;
  embeddedUser: string;
  embeddedPassword: string;
  embeddedDatabase: string;
};

export type SessionConfig = {
  secret: string;
  ttlMinutes: number;
  cookieName: string;
  secure: boolean;
};

export type PagBankConfig = {
  environment: 'sandbox' | 'production';
  apiBaseUrl: string;
  token: string;
  webhookSignatureHeader: string;
  webhookSecret: string;
  notificationUrl: string;
};

export type PaymentRulesConfig = {
  defaultSeatReservationMinutes: number;
  reconcileIntervalMinutes: number;
  reconcileWindowHours: number;
  maxInstallments: number;
  minInstallmentCents: number;
};

export type CredentialConfig = {
  secret: string;
  baseUrl: string;
};

export type CertificateConfig = {
  secret: string;
  baseUrl: string;
};

export type CommunicationConfig = {
  mailProvider: string;
  mailFrom: string;
  whatsappProvider: string;
};

export type SchedulerConfig = {
  enabled: boolean;
  intervalSeconds: number;
};

export type AppConfig = {
  nodeEnv: NodeEnvironment;
  isProduction: boolean;
  port: number;
  appName: string;
  appUrl: string;
  logLevel: string;
  database: DatabaseConfig;
  session: SessionConfig;
  pagbank: PagBankConfig;
  payments: PaymentRulesConfig;
  credentials: CredentialConfig;
  certificates: CertificateConfig;
  communications: CommunicationConfig;
  scheduler: SchedulerConfig;
};

export function buildAppConfig(): AppConfig {
  const nodeEnv = readNodeEnv();
  const appUrl = readString('APP_URL', 'http://localhost:3000');

  const config: AppConfig = {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    port: readNumber('PORT', 3000),
    appName: readString('APP_NAME', 'RaroTickets'),
    appUrl,
    logLevel: readString('LOG_LEVEL', 'info'),
    database: {
      url: readString('DATABASE_URL', 'postgresql://postgres:postgres@127.0.0.1:55432/rarotickets'),
      ssl: readBoolean('DATABASE_SSL', false),
      poolMax: readNumber('DATABASE_POOL_MAX', 10),
      autoMigrate: readBoolean('DATABASE_AUTO_MIGRATE', false),
      autoSeed: readBoolean('DATABASE_AUTO_SEED', false),
      embedded: readBoolean('DATABASE_EMBEDDED', false),
      embeddedPort: readNumber('DATABASE_EMBEDDED_PORT', 55432),
      embeddedDataDir: readString('DATABASE_EMBEDDED_DATA_DIR', '.pgdata'),
      embeddedUser: readString('DATABASE_EMBEDDED_USER', 'postgres'),
      embeddedPassword: readString('DATABASE_EMBEDDED_PASSWORD', 'postgres'),
      embeddedDatabase: readString('DATABASE_EMBEDDED_DATABASE', 'rarotickets'),
    },
    session: {
      secret: readString('SESSION_SECRET', 'dev-only-session-secret'),
      ttlMinutes: readNumber('SESSION_TTL_MINUTES', 480),
      cookieName: readString('SESSION_COOKIE_NAME', 'rarotickets_session'),
      secure: readBoolean('COOKIE_SECURE', nodeEnv === 'production'),
    },
    pagbank: {
      environment: readString('PAGBANK_ENV', 'sandbox') === 'production' ? 'production' : 'sandbox',
      apiBaseUrl: readString('PAGBANK_API_BASE_URL', 'https://sandbox.api.pagseguro.com'),
      token: readString('PAGBANK_TOKEN', 'PREENCHER_TOKEN_PAGBANK'),
      webhookSignatureHeader: readString('PAGBANK_WEBHOOK_SIGNATURE_HEADER', 'x-authenticity-token'),
      webhookSecret: readString('PAGBANK_WEBHOOK_SECRET', 'PREENCHER_SEGREDO_WEBHOOK'),
      notificationUrl: readString('PAGBANK_NOTIFICATION_URL', `${appUrl}/api/v1/webhooks/pagbank`),
    },
    payments: {
      defaultSeatReservationMinutes: readNumber('DEFAULT_SEAT_RESERVATION_MINUTES', 15),
      reconcileIntervalMinutes: readNumber('PAYMENT_RECONCILE_INTERVAL_MINUTES', 10),
      reconcileWindowHours: readNumber('PAYMENT_RECONCILE_WINDOW_HOURS', 48),
      maxInstallments: readNumber('MAX_INSTALLMENTS', 12),
      minInstallmentCents: readNumber('MIN_INSTALLMENT_CENTS', 500),
    },
    credentials: {
      secret: readString('CREDENTIAL_SECRET', 'dev-only-credential-secret'),
      baseUrl: readString('CREDENTIAL_BASE_URL', `${appUrl}/credencial`),
    },
    certificates: {
      secret: readString('CERTIFICATE_SECRET', 'dev-only-certificate-secret'),
      baseUrl: readString('CERTIFICATE_BASE_URL', `${appUrl}/certificados`),
    },
    communications: {
      mailProvider: readString('MAIL_PROVIDER', 'log'),
      mailFrom: readString('MAIL_FROM', 'nao-responda@rarotickets.com.br'),
      whatsappProvider: readString('WHATSAPP_PROVIDER', 'disabled'),
    },
    scheduler: {
      enabled: readBoolean('SCHEDULER_ENABLED', true),
      intervalSeconds: readNumber('SCHEDULER_INTERVAL_SECONDS', 60),
    },
  };

  assertProductionSecrets({
    nodeEnv,
    sessionSecret: config.session.secret,
    credentialSecret: config.credentials.secret,
    certificateSecret: config.certificates.secret,
    databaseUrl: config.database.url,
  });

  const embeddedDatabase = readOptionalString('DATABASE_NAME');
  if (embeddedDatabase) config.database.embeddedDatabase = embeddedDatabase;

  return config;
}
