import { describe, expect, it } from 'vitest';
import { isRaroNexusConfigured, loadAppConfig } from './app.config';
import type { LoadAppConfigParams } from './app.config';

type AppConfigCase = { environment: LoadAppConfigParams['environment']; workingDirectory?: string };

const loadConfig = (params: AppConfigCase) => loadAppConfig({
  environment: params.environment,
  workingDirectory: params.workingDirectory ?? '/workspace/rarotickets',
});

describe('loadAppConfig', () => {
  it('enables the synthetic login only outside production', () => {
    const config = loadConfig({
      environment: {
        NODE_ENV: 'development',
        APP_BASE_URL: 'http://localhost:5173',
        DEMO_LOGIN_ENABLED: 'true',
      },
    });

    expect(config.demoLoginEnabled).toBe(true);
    expect(config.cookieSecure).toBe(false);
    expect(config.appBaseUrl).toBe('http://localhost:5173');
  });

  it('requires HTTPS and disables demonstration credentials in production', () => {
    const config = loadConfig({
      environment: {
        NODE_ENV: 'production',
        APP_BASE_URL: 'http://tickets.example.com',
        RARONEXUS_BASE_URL: 'http://identity.example.com',
        RARONEXUS_CLIENT_ID: 'tickets-prod',
        RARONEXUS_CLIENT_SECRET: 'server-secret',
        DEMO_LOGIN_ENABLED: 'true',
      },
    });

    expect(config.cookieSecure).toBe(true);
    expect(config.demoLoginEnabled).toBe(false);
    expect(config.appBaseUrl).toBeNull();
    expect(config.raronexus.baseUrl).toBeNull();
    expect(isRaroNexusConfigured(config)).toBe(false);
  });

  it('accepts complete HTTPS SSO settings and applies safe timeout limits', () => {
    const config = loadConfig({
      environment: {
        NODE_ENV: 'production',
        APP_BASE_URL: 'https://tickets.example.com/',
        RARONEXUS_BASE_URL: 'https://identity.example.com',
        RARONEXUS_CLIENT_ID: 'tickets-prod',
        RARONEXUS_CLIENT_SECRET: 'server-secret',
        RARONEXUS_REQUEST_TIMEOUT_MS: '45000',
        RARONEXUS_SESSION_COOKIE_MAX_AGE_SECONDS: '999999',
      },
    });

    expect(isRaroNexusConfigured(config)).toBe(true);
    expect(config.appBaseUrl).toBe('https://tickets.example.com');
    expect(config.raronexusRequestTimeoutMs).toBe(30000);
    expect(config.sessionCookieMaxAgeSeconds).toBe(604800);
  });
});
