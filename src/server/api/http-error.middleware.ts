import type { ErrorRequestHandler } from 'express';
import { RaroNexusIntegrationError } from '../../modules/auth/server/infrastructure/providers/raro-nexus-integration.error';
import { HttpResponse } from './http-response';

export const httpErrorMiddleware: ErrorRequestHandler = (error: unknown, _request, response, _next): void => {
  if (error instanceof RaroNexusIntegrationError) {
    const statusCode = error.code === 'NOT_CONFIGURED' ? 503 : 502;
    const message = error.code === 'NOT_CONFIGURED'
      ? 'O acesso SSO ainda não foi configurado neste ambiente.'
      : 'O RaroNexus não está disponível para validar sua sessão.';
    response.status(statusCode).json(HttpResponse.failure({ statusCode, code: error.code, message }).body);
    return;
  }
  response.status(500).json(HttpResponse.failure({ statusCode: 500, code: 'INTERNAL_ERROR', message: 'Não foi possível concluir a operação.' }).body);
};
