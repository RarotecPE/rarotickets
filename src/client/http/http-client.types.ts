export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type HttpRequestParams = {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
};

export type ApiErrorPayload = { code: string; message: string; details?: unknown };

export type ApiEnvelope<Data> = { data: Data; meta?: Record<string, unknown> };

/** Erro de transporte/negócio vindo da API — o client exibe `message`. */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(params: { status: number; code: string; message: string; details?: unknown }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
  }
}

/** Contrato de transporte do client (implementado com `fetch`). */
export interface HttpClient {
  request<Data>(path: string, params?: HttpRequestParams): Promise<ApiEnvelope<Data>>;
  get<Data>(path: string, params?: Omit<HttpRequestParams, 'method' | 'body'>): Promise<ApiEnvelope<Data>>;
  post<Data>(path: string, body?: unknown, params?: Omit<HttpRequestParams, 'method' | 'body'>): Promise<ApiEnvelope<Data>>;
  put<Data>(path: string, body?: unknown, params?: Omit<HttpRequestParams, 'method' | 'body'>): Promise<ApiEnvelope<Data>>;
  delete<Data>(path: string, params?: Omit<HttpRequestParams, 'method' | 'body'>): Promise<ApiEnvelope<Data>>;
}
