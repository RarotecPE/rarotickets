export type HttpMethod = "GET" | "POST" | "PATCH";
export type HttpRequestParams = { path: string; method: HttpMethod; body?: unknown; query?: Record<string, string | number | boolean | undefined>; signal?: AbortSignal };
export type HttpResponse<T> = { data: T; meta?: Record<string, unknown> };
export type HttpClientDependencies = { fetcher?: typeof fetch };

export interface IHttpClient {
  request<T>(params: HttpRequestParams): Promise<HttpResponse<T>>;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;
  constructor(params: ApiErrorParams) {
    super(params.message);
    this.code = params.code;
    this.status = params.status;
    this.details = params.details;
  }
}
export type ApiErrorParams = { code: string; message: string; status: number; details?: unknown };

type ErrorEnvelope = { error?: { code?: string; message?: string; details?: unknown } };
type BuildRequestUrlParams = { path: string; query?: HttpRequestParams["query"] };
type ParseApiErrorParams = { payload: unknown; status: number };

export class FetchHttpClient implements IHttpClient {
  private readonly fetcher: typeof fetch;
  constructor(dependencies: HttpClientDependencies = {}) {
    const rawFetcher = dependencies.fetcher ?? (typeof window !== "undefined" ? window.fetch : fetch);
    const target = typeof window !== "undefined" ? window : globalThis;
    this.fetcher = rawFetcher.bind(target);
  }
  async request<T>(params: HttpRequestParams): Promise<HttpResponse<T>> {
    const url = buildRequestUrl({ path: params.path, query: params.query });
    const isMultipart = isFormData(params.body);
    const headers = params.body === undefined || isMultipart ? undefined : { "Content-Type": "application/json" };
    const body: BodyInit | undefined = params.body === undefined ? undefined : isFormData(params.body) ? params.body : JSON.stringify(params.body);
    const fetcher = this.fetcher;
    const response = await fetcher(url, { method: params.method, headers, body, cache: "no-store", credentials: "same-origin", signal: params.signal });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw parseApiError({ payload, status: response.status });
    if (!isRecord(payload) || !("data" in payload)) throw new ApiError({ code: "INVALID_API_RESPONSE", message: "Resposta inválida do servidor.", status: response.status });
    return payload as HttpResponse<T>;
  }
}

export type ApiServiceDependencies = { httpClient: IHttpClient };
export abstract class ApiService {
  protected readonly httpClient: IHttpClient;
  protected constructor(dependencies: ApiServiceDependencies) {
    this.httpClient = dependencies.httpClient;
  }
}

function buildRequestUrl(params: BuildRequestUrlParams): string {
  if (!params.query) return params.path;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params.query)) if (value !== undefined) search.set(key, String(value));
  const query = search.toString();
  return query ? `${params.path}?${query}` : params.path;
}

function parseApiError(params: ParseApiErrorParams): ApiError {
  const envelope = isRecord(params.payload) ? params.payload as ErrorEnvelope : null;
  const rawMessage = envelope?.error?.message ?? "A operação não foi concluída.";
  const isTechnical = rawMessage.includes("Failed query") || rawMessage.includes("select \"");
  const message = isTechnical
    ? "Não foi possível carregar as informações do servidor. Tente novamente em instantes."
    : rawMessage;
  return new ApiError({ code: envelope?.error?.code ?? "API_ERROR", message, status: params.status, details: envelope?.error?.details });
}

type FormDataCandidate = unknown;
function isFormData(value: FormDataCandidate): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
