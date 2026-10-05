import { ApiError } from './http-client.types';
import type { ApiEnvelope, HttpClient, HttpRequestParams } from './http-client.types';

const API_PREFIX = '/api/v1';

export type FetchHttpClientDependencies = { baseUrl?: string };

/**
 * Cliente HTTP único do front-end. Sempre usa caminhos relativos: em
 * desenvolvimento e em produção o client é servido pelo mesmo processo da API.
 */
export class FetchHttpClient implements HttpClient {
  private readonly baseUrl: string;

  constructor(dependencies: FetchHttpClientDependencies = {}) {
    this.baseUrl = dependencies.baseUrl ?? API_PREFIX;
  }

  async request<Data>(path: string, params: HttpRequestParams = {}): Promise<ApiEnvelope<Data>> {
    const url = new URL(`${this.baseUrl}${path}`, window.location.origin);
    for (const [key, value] of Object.entries(params.query ?? {})) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }

    const response = await fetch(url.toString(), {
      method: params.method ?? 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(params.headers ?? {}),
      },
      body: params.body === undefined ? undefined : JSON.stringify(params.body),
    });

    if (response.status === 204) return { data: undefined as Data };

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const error = (payload as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
      throw new ApiError({
        status: response.status,
        code: error?.code ?? 'UNKNOWN_ERROR',
        message: error?.message ?? `Falha na requisição (${response.status})`,
        details: error?.details,
      });
    }

    const envelope = (payload ?? { data: undefined }) as ApiEnvelope<Data>;
    return envelope;
  }

  get<Data>(path: string, params?: Omit<HttpRequestParams, 'method' | 'body'>): Promise<ApiEnvelope<Data>> {
    return this.request<Data>(path, { ...params, method: 'GET' });
  }

  post<Data>(path: string, body?: unknown, params?: Omit<HttpRequestParams, 'method' | 'body'>): Promise<ApiEnvelope<Data>> {
    return this.request<Data>(path, { ...params, method: 'POST', body });
  }

  put<Data>(path: string, body?: unknown, params?: Omit<HttpRequestParams, 'method' | 'body'>): Promise<ApiEnvelope<Data>> {
    return this.request<Data>(path, { ...params, method: 'PUT', body });
  }

  delete<Data>(path: string, params?: Omit<HttpRequestParams, 'method' | 'body'>): Promise<ApiEnvelope<Data>> {
    return this.request<Data>(path, { ...params, method: 'DELETE' });
  }
}

export const httpClient: HttpClient = new FetchHttpClient();
