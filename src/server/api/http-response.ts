import { ConflictError } from '@core/domain/errors/conflict.error';
import { DomainError } from '@core/domain/errors/domain-error.base';
import { ForbiddenError } from '@core/domain/errors/forbidden.error';
import { NotFoundError } from '@core/domain/errors/not-found.error';
import { UnauthorizedError } from '@core/domain/errors/unauthorized.error';
import { ValidationError } from '@core/domain/errors/validation.error';

export type HttpResponseBody = unknown;

export type HttpResponseCookie = {
  name: string;
  value: string;
  maxAgeSeconds?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  path?: string;
};

export class HttpResponse {
  public readonly status: number;
  public readonly body: HttpResponseBody;
  public readonly cookies: HttpResponseCookie[];

  private constructor(status: number, body: HttpResponseBody, cookies: HttpResponseCookie[] = []) {
    this.status = status;
    this.body = body;
    this.cookies = cookies;
  }

  /** Anexa cookies à resposta HTTP (usado na sessão de usuário/participante). */
  public withCookies(cookies: HttpResponseCookie[]): HttpResponse {
    return new HttpResponse(this.status, this.body, [...this.cookies, ...cookies]);
  }

  public static ok(data: unknown, meta?: Record<string, unknown>): HttpResponse {
    return new HttpResponse(200, meta ? { data, meta } : { data });
  }

  public static created(data: unknown): HttpResponse {
    return new HttpResponse(201, { data });
  }

  public static noContent(): HttpResponse {
    return new HttpResponse(204, null);
  }

  public static failure(status: number, code: string, message: string, details?: unknown): HttpResponse {
    return new HttpResponse(status, { error: { code, message, ...(details ? { details } : {}) } });
  }

  public static badRequest(message: string, code = 'VALIDATION_ERROR'): HttpResponse {
    return HttpResponse.failure(400, code, message);
  }

  public static unauthorized(message = 'Sessão inválida ou expirada', code = 'UNAUTHORIZED'): HttpResponse {
    return HttpResponse.failure(401, code, message);
  }

  public static forbidden(message: string, code = 'FORBIDDEN'): HttpResponse {
    return HttpResponse.failure(403, code, message);
  }

  public static notFound(message: string, code = 'NOT_FOUND'): HttpResponse {
    return HttpResponse.failure(404, code, message);
  }

  public static conflict(message: string, code = 'CONFLICT'): HttpResponse {
    return HttpResponse.failure(409, code, message);
  }

  public static unprocessable(message: string, code = 'BUSINESS_RULE_VIOLATION'): HttpResponse {
    return HttpResponse.failure(422, code, message);
  }

  public static serverError(message = 'Erro interno inesperado'): HttpResponse {
    return HttpResponse.failure(500, 'INTERNAL_ERROR', message);
  }
}

/** Converte erros de domínio em respostas HTTP — sem lógica de negócio aqui. */
export function mapDomainErrorToHttpResponse(error: unknown): HttpResponse {
  if (error instanceof DomainError) {
    if (error instanceof NotFoundError) return HttpResponse.notFound(error.message, error.code);
    if (error instanceof ConflictError) return HttpResponse.conflict(error.message, error.code);
    if (error instanceof ForbiddenError) return HttpResponse.forbidden(error.message, error.code);
    if (error instanceof UnauthorizedError) return HttpResponse.unauthorized(error.message, error.code);
    if (error instanceof ValidationError) return HttpResponse.badRequest(error.message, error.code);
    return HttpResponse.unprocessable(error.message, error.code);
  }

  if (error instanceof Error) {
    const message = error.message || 'Erro inesperado';
    const isValidation = /obrigatór|inválid|deve|não pode|não é possível|excede|ultrapass/i.test(message);
    return isValidation
      ? HttpResponse.failure(422, 'VALIDATION_ERROR', message)
      : HttpResponse.serverError(message);
  }

  return HttpResponse.serverError();
}
