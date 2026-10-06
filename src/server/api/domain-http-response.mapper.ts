import { DomainError } from '../../@core/domain/errors/domain-error.base';
import { HttpResponse } from './http-response';

export type MapDomainErrorParams = { error: Error };

export function mapDomainErrorToHttpResponse(params: MapDomainErrorParams): HttpResponse {
  const code = params.error instanceof DomainError ? params.error.code : 'INTERNAL_ERROR';
  const statusCode = resolveStatusCode(code);
  const message = statusCode >= 500 ? 'Não foi possível concluir a operação.' : params.error.message;
  return HttpResponse.failure({ statusCode, code, message });
}

function resolveStatusCode(code: string): number {
  if (code.endsWith('_NOT_FOUND')) return 404;
  if (code === 'UNKNOWN_APPLICATION_ROLE') return 403;
  if (code === 'INACTIVE_GLOBAL_SESSION') return 401;
  if (code === 'INVALID_GLOBAL_IDENTITY') return 502;
  if (code === 'INTERNAL_ERROR') return 500;
  return 400;
}
