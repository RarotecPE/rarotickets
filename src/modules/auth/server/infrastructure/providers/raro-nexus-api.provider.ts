import { RaroNexusProvider } from './raro-nexus-provider.base';
import { RaroNexusIntegrationError } from './raro-nexus-integration.error';
import type { RaroNexusSettings } from '../../../../../server/config/app.config';
import type {
  ExchangeAuthorizationCodeParams,
  IntrospectGlobalSessionParams,
  ListRaroNexusApplicationsParams,
  RaroNexusApplicationSnapshot,
  RaroNexusAuthorizationResponse,
  RaroNexusIntrospectionResponse,
  RaroNexusRoleSnapshot,
  RaroNexusUserSnapshot,
  RevokeGlobalSessionParams,
} from '../../../domain/services/raro-nexus-provider.interface';

export type RaroNexusApiProviderDependencies = {
  settings: RaroNexusSettings;
  requestTimeoutMs: number;
  fetcher?: typeof fetch;
};

type RequiredRaroNexusSettings = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
};

type JsonRecord = Record<string, unknown>;
type PostJsonParams = { url: string; body: JsonRecord };
type RequestJsonParams = { url: string; init: RequestInit };
type ReadStringParams = { record: JsonRecord; key: string };

const MAX_SESSION_TOKEN_LENGTH = 3000;

export class RaroNexusApiProvider extends RaroNexusProvider {
  private readonly settings: RaroNexusSettings;
  private readonly requestTimeoutMs: number;
  private readonly fetcher: typeof fetch;

  constructor(dependencies: RaroNexusApiProviderDependencies) {
    super();
    this.settings = dependencies.settings;
    this.requestTimeoutMs = dependencies.requestTimeoutMs;
    this.fetcher = dependencies.fetcher ?? fetch;
  }

  async exchangeAuthorizationCode(params: ExchangeAuthorizationCodeParams): Promise<RaroNexusAuthorizationResponse> {
    const settings = this.getRequiredSettings();
    const payload = await this.postJson({
      url: `${settings.baseUrl}/api/v1/sso/token`,
      body: {
        grant_type: 'authorization_code',
        client_id: settings.clientId,
        client_secret: settings.clientSecret,
        code: params.code,
        redirect_uri: params.redirectUri,
      },
    });
    const data = this.requireData(payload);
    const token = this.readString({ record: data, key: 'global_session_token' });
    const user = this.readUser(data.user);
    const role = this.readRole(data.role);
    if (!token || token.length > MAX_SESSION_TOKEN_LENGTH) throw this.invalidResponse();
    return { token, user, role };
  }

  async introspectGlobalSession(params: IntrospectGlobalSessionParams): Promise<RaroNexusIntrospectionResponse> {
    const settings = this.getRequiredSettings();
    const payload = await this.postJson({
      url: `${settings.baseUrl}/api/v1/sessions/introspect`,
      body: { token: params.token, client_id: settings.clientId },
    });
    const data = this.requireData(payload);
    if (typeof data.active !== 'boolean') throw this.invalidResponse();
    if (!data.active) return { active: false };
    return {
      active: true,
      user: this.readUser(data.user),
      role: this.readRole(data.role),
    };
  }

  async revokeGlobalSession(params: RevokeGlobalSessionParams): Promise<boolean> {
    const settings = this.getRequiredSettings();
    const response = await this.requestJson({
      url: `${settings.baseUrl}/api/v1/sessions/revoke`,
      init: {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token }),
      },
    });
    return response.success === true;
  }

  async listApplications(params: ListRaroNexusApplicationsParams): Promise<RaroNexusApplicationSnapshot[]> {
    const settings = this.getRequiredSettings();
    const response = await this.requestJson({
      url: `${settings.baseUrl}/api/v1/applications`,
      init: {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Cookie: `raronexus_global_session=${encodeURIComponent(params.token)}`,
        },
      },
    });
    if (response.success !== true || !Array.isArray(response.data)) throw this.invalidResponse();
    return response.data.map((application) => this.readApplication(application));
  }

  private async postJson(params: PostJsonParams): Promise<JsonRecord> {
    const response = await this.requestJson({
      url: params.url,
      init: {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params.body),
      },
    });
    if (response.success !== true) throw this.invalidResponse();
    return response;
  }

  private async requestJson(params: RequestJsonParams): Promise<JsonRecord> {
    let response: Response;
    try {
      response = await this.fetcher(params.url, {
        ...params.init,
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });
    } catch {
      throw new RaroNexusIntegrationError({ code: 'UNAVAILABLE' });
    }
    if (!response.ok) throw new RaroNexusIntegrationError({ code: 'UNAVAILABLE' });
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw this.invalidResponse();
    }
    return this.readRecord(payload);
  }

  private getRequiredSettings(): RequiredRaroNexusSettings {
    const { baseUrl, clientId, clientSecret } = this.settings;
    if (!baseUrl || !clientId || !clientSecret) {
      throw new RaroNexusIntegrationError({ code: 'NOT_CONFIGURED' });
    }
    return { baseUrl, clientId, clientSecret };
  }

  private requireData(payload: JsonRecord): JsonRecord {
    if (payload.success !== true) throw this.invalidResponse();
    return this.readRecord(payload.data);
  }

  private readUser(value: unknown): RaroNexusUserSnapshot {
    const user = this.readRecord(value);
    const id = this.readString({ record: user, key: 'id' });
    const name = this.readString({ record: user, key: 'nome' });
    const email = this.readString({ record: user, key: 'email' });
    const avatar = user.avatar_url;
    if (!id || !name || !email || (avatar !== null && typeof avatar !== 'string' && avatar !== undefined)) {
      throw this.invalidResponse();
    }
    return { id, name, email, avatarUrl: typeof avatar === 'string' ? avatar : null };
  }

  private readRole(value: unknown): RaroNexusRoleSnapshot {
    const role = this.readRecord(value);
    const key = this.readString({ record: role, key: 'chave' });
    const name = this.readString({ record: role, key: 'nome' });
    if (!key || !name) throw this.invalidResponse();
    return { key, name };
  }

  private readApplication(value: unknown): RaroNexusApplicationSnapshot {
    const application = this.readRecord(value);
    const name = this.readString({ record: application, key: 'nome' });
    const clientId = this.readString({ record: application, key: 'client_id' });
    if (!name || !clientId || typeof application.ativo !== 'boolean') throw this.invalidResponse();
    return {
      name,
      clientId,
      logoUrl: this.readNullableString(application.logo_url),
      homepageUrl: this.readNullableString(application.homepage_url),
      active: application.ativo,
    };
  }

  private readRecord(value: unknown): JsonRecord {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw this.invalidResponse();
    return value as JsonRecord;
  }

  private readString(params: ReadStringParams): string | null {
    const value = params.record[params.key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private readNullableString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private invalidResponse(): RaroNexusIntegrationError {
    return new RaroNexusIntegrationError({ code: 'INVALID_RESPONSE' });
  }
}
