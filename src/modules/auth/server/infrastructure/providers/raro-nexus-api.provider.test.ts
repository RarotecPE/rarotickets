import { describe, expect, it } from 'vitest';
import { RaroNexusApiProvider } from './raro-nexus-api.provider';
import { RaroNexusIntegrationError } from './raro-nexus-integration.error';
import type { RaroNexusSettings } from '../../../../../server/config/app.config';

const TEST_SETTINGS: RaroNexusSettings = {
  baseUrl: 'https://identity.example.com',
  clientId: 'rarotickets-test',
  clientSecret: 'server-secret-only',
};

function createJsonFetcher(payload: unknown): typeof fetch {
  return async (_input, _init) => new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('RaroNexusApiProvider', () => {
  it('troca o código usando os nomes de campos oficiais e a URI de callback cadastrada', async () => {
    let requestBody: Record<string, unknown> = {};
    const fetcher: typeof fetch = async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({
        success: true,
        data: {
          global_session_token: 'global-session-secret',
          user: { id: 'user-1', nome: 'Sofia Martins', email: 'sofia@example.com', avatar_url: null },
          role: { chave: 'ADMINISTRADOR', nome: 'Administrador' },
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    const provider = new RaroNexusApiProvider({ settings: TEST_SETTINGS, requestTimeoutMs: 1000, fetcher });

    const response = await provider.exchangeAuthorizationCode({
      code: 'temporary-code',
      redirectUri: 'https://tickets.example.com/api/auth/raronexus/callback',
    });

    expect(requestBody).toMatchObject({
      grant_type: 'authorization_code',
      client_id: 'rarotickets-test',
      client_secret: 'server-secret-only',
      code: 'temporary-code',
      redirect_uri: 'https://tickets.example.com/api/auth/raronexus/callback',
    });
    expect(response.token).toBe('global-session-secret');
    expect(response.user.name).toBe('Sofia Martins');
  });

  it('envia o cookie global codificado ao consultar o catálogo sem cache', async () => {
    let requestHeaders: HeadersInit | undefined;
    let requestCache: RequestCache | undefined;
    const fetcher: typeof fetch = async (_input, init) => {
      requestHeaders = init?.headers;
      requestCache = init?.cache;
      return new Response(JSON.stringify({
        success: true,
        data: [{ nome: 'Raro CRM', client_id: 'crm', logo_url: null, homepage_url: 'https://crm.example.com', ativo: true }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    const provider = new RaroNexusApiProvider({ settings: TEST_SETTINGS, requestTimeoutMs: 1000, fetcher });

    const applications = await provider.listApplications({ token: 'a/b+c' });

    expect(new Headers(requestHeaders).get('Cookie')).toBe('raronexus_global_session=a%2Fb%2Bc');
    expect(requestCache).toBe('no-store');
    expect(applications[0]?.clientId).toBe('crm');
  });

  it('falha de forma fechada se a instância não responder', async () => {
    const failedFetcher: typeof fetch = async () => { throw new Error('network detail should not escape'); };
    const provider = new RaroNexusApiProvider({ settings: TEST_SETTINGS, requestTimeoutMs: 1000, fetcher: failedFetcher });

    await expect(provider.introspectGlobalSession({ token: 'session-token' }))
      .rejects.toMatchObject({ code: 'UNAVAILABLE' } satisfies Partial<RaroNexusIntegrationError>);
  });

  it('não permite chamar o provedor com credenciais ausentes', async () => {
    const provider = new RaroNexusApiProvider({
      settings: { baseUrl: null, clientId: null, clientSecret: null },
      requestTimeoutMs: 1000,
      fetcher: createJsonFetcher({ success: true }),
    });

    await expect(provider.introspectGlobalSession({ token: 'session-token' }))
      .rejects.toMatchObject({ code: 'NOT_CONFIGURED' } satisfies Partial<RaroNexusIntegrationError>);
  });
});
