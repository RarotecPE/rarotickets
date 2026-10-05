import type { NextFunction, Request, Response } from 'express';
import { mapDomainErrorToHttpResponse } from '@server/api/http-response';
import type { ILogger } from '@server/infrastructure/logger/logger';

export type ErrorMiddlewareDependencies = { logger: ILogger };

export function createErrorMiddleware(dependencies: ErrorMiddlewareDependencies) {
  return (error: unknown, request: Request, response: Response, _next: NextFunction): void => {
    const httpResponse = mapDomainErrorToHttpResponse(error);
    if (httpResponse.status >= 500) {
      dependencies.logger.error('Erro não tratado na requisição', {
        path: request.path,
        method: request.method,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
    response.status(httpResponse.status).json(httpResponse.body);
  };
}
