export type HttpMethod = 'GET' | 'POST' | 'PATCH';
export type HttpRequestParams = {
  path: string;
  method?: HttpMethod;
  body?: unknown;
};

export type HttpClient = {
  request<ResponseData>(params: HttpRequestParams): Promise<ResponseData>;
};

export type ApiServiceDependencies = { httpClient: HttpClient };
export type ApiClientErrorParams = { statusCode: number; code: string; message: string };
export type ToApiErrorParams = { response: Response; body: unknown };
export type ApiErrorBody = { error: { code: string; message: string } };

export class ApiClientError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(params: ApiClientErrorParams) {
    super(params.message);
    this.name = 'ApiClientError';
    this.statusCode = params.statusCode;
    this.code = params.code;
  }
}

export class FetchHttpClient implements HttpClient {
  async request<ResponseData>(params: HttpRequestParams): Promise<ResponseData> {
    let response: Response;
    try {
      response = await fetch(params.path, {
        method: params.method ?? 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: params.body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: params.body === undefined ? undefined : JSON.stringify(params.body),
      });
    } catch {
      throw new ApiClientError({ statusCode: 0, code: 'NETWORK_ERROR', message: 'Não foi possível conectar ao sistema.' });
    }
    const responseBody = await this.readResponseBody(response);
    if (!response.ok) throw this.toApiError({ response, body: responseBody });
    return responseBody as ResponseData;
  }

  private async readResponseBody(response: Response): Promise<unknown> {
    try {
      return await response.json() as unknown;
    } catch {
      throw new ApiClientError({ statusCode: response.status, code: 'INVALID_RESPONSE', message: 'O servidor retornou uma resposta inválida.' });
    }
  }

  private toApiError(params: ToApiErrorParams): ApiClientError {
    const body = params.body;
    if (isApiErrorBody(body)) {
      return new ApiClientError({
        statusCode: params.response.status,
        code: body.error.code,
        message: body.error.message,
      });
    }
    return new ApiClientError({
      statusCode: params.response.status,
      code: 'REQUEST_FAILED',
      message: 'Não foi possível concluir a solicitação.',
    });
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (!value || typeof value !== 'object' || !('error' in value)) return false;
  const errorValue = value.error;
  return Boolean(
    errorValue
    && typeof errorValue === 'object'
    && 'code' in errorValue
    && typeof errorValue.code === 'string'
    && 'message' in errorValue
    && typeof errorValue.message === 'string',
  );
}

export abstract class ApiService {
  protected readonly httpClient: HttpClient;

  protected constructor(dependencies: ApiServiceDependencies) {
    this.httpClient = dependencies.httpClient;
  }
}
