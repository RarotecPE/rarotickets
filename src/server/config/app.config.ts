import { resolve } from 'node:path';

export type RaroNexusSettings = {
  baseUrl: string | null;
  clientId: string | null;
  clientSecret: string | null;
};

export type AppConfig = {
  appBaseUrl: string | null;
  raronexus: RaroNexusSettings;
  raronexusRequestTimeoutMs: number;
  sessionCookieMaxAgeSeconds: number;
  participantSessionCookieMaxAgeSeconds: number;
  cookieSecure: boolean;
  demoLoginEnabled: boolean;
  dataDirectory: string;
  port: number;
  isProduction: boolean;
};

export type LoadAppConfigParams = {
  environment: NodeJS.ProcessEnv;
  workingDirectory: string;
};
type EnvironmentValue = string | undefined;
type ReadOriginParams = { value: EnvironmentValue; requireHttps: boolean };
type ReadPositiveIntegerParams = { value: EnvironmentValue; fallback: number };

export function loadAppConfig(params: LoadAppConfigParams): AppConfig {
  const { environment } = params;
  const isProduction = environment.NODE_ENV === 'production';
  const appBaseUrl = readOrigin({ value: environment.APP_BASE_URL, requireHttps: isProduction });
  const baseUrl = readOrigin({ value: environment.RARONEXUS_BASE_URL, requireHttps: isProduction });
  const maxAgeValue = readPositiveInteger({ value: environment.RARONEXUS_SESSION_COOKIE_MAX_AGE_SECONDS, fallback: 28800 });
  const participantMaxAgeValue = readPositiveInteger({ value: environment.PARTICIPANT_SESSION_COOKIE_MAX_AGE_SECONDS, fallback: 28800 });
  const timeoutValue = readPositiveInteger({ value: environment.RARONEXUS_REQUEST_TIMEOUT_MS, fallback: 5000 });

  return {
    appBaseUrl,
    raronexus: {
      baseUrl,
      clientId: readOptionalValue(environment.RARONEXUS_CLIENT_ID),
      clientSecret: readOptionalValue(environment.RARONEXUS_CLIENT_SECRET),
    },
    raronexusRequestTimeoutMs: Math.min(timeoutValue, 30000),
    sessionCookieMaxAgeSeconds: Math.min(maxAgeValue, 604800),
    participantSessionCookieMaxAgeSeconds: Math.min(participantMaxAgeValue, 604800),
    cookieSecure: isProduction,
    demoLoginEnabled: !isProduction && environment.DEMO_LOGIN_ENABLED === 'true',
    dataDirectory: resolve(params.workingDirectory, environment.DATA_DIRECTORY ?? '.data'),
    port: readPositiveInteger({ value: environment.PORT, fallback: 3001 }),
    isProduction,
  };
}

export function isRaroNexusConfigured(config: AppConfig): boolean {
  return Boolean(
    config.appBaseUrl
    && config.raronexus.baseUrl
    && config.raronexus.clientId
    && config.raronexus.clientSecret,
  );
}

function readOrigin(params: ReadOriginParams): string | null {
  const normalizedValue = readOptionalValue(params.value);
  if (!normalizedValue) return null;
  try {
    const parsedUrl = new URL(normalizedValue);
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') return null;
    if (params.requireHttps && parsedUrl.protocol !== 'https:') return null;
    if (parsedUrl.username || parsedUrl.password) return null;
    if (parsedUrl.pathname !== '/' || parsedUrl.search || parsedUrl.hash) return null;
    return parsedUrl.origin;
  } catch {
    return null;
  }
}

function readOptionalValue(value: EnvironmentValue): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

function readPositiveInteger(params: ReadPositiveIntegerParams): number {
  const parsedValue = Number(params.value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : params.fallback;
}
