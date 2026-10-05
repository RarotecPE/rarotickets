import express from 'express';
import type { Express, RequestHandler } from 'express';
import cookieParser from 'cookie-parser';
import type { Container } from '@server/di/container';
import { createErrorMiddleware } from '@server/middlewares/error.middleware';
import { requestContextMiddleware } from '@server/middlewares/request-context.middleware';
import { sendHttpResponse } from '@server/api/http-router';
import { HttpResponse } from '@server/api/http-response';

export type HttpBootstrapParams = { container: Container; serveClient?: RequestHandler | null };
export type HttpBootstrapResult = { app: Express; apiPrefix: string };

const API_PREFIX = '/api/v1';

/**
 * Monta o servidor HTTP: middlewares de contexto, JSON (preservando o corpo
 * bruto para validar a assinatura do webhook), rotas da API e client SPA.
 */
export function createHttpApp(params: HttpBootstrapParams): HttpBootstrapResult {
  const { container } = params;
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.use(
    express.json({
      limit: '2mb',
      verify: (request, _response, buffer) => {
        (request as express.Request & { rawBody?: string }).rawBody = buffer.toString('utf8');
      },
    }),
  );
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(requestContextMiddleware);

  const api = express.Router();
  for (const router of container.routers) {
    api.use(router);
  }

  api.get('/health', (_request, response) => {
    sendHttpResponse({
      response,
      httpResponse: HttpResponse.ok({
        status: 'ok',
        app: container.config.appName,
        environment: container.config.nodeEnv,
        provider: container.providers.paymentProvider.providerName,
      }),
    });
  });

  app.use(API_PREFIX, api);

  if (params.serveClient) {
    app.use(params.serveClient);
  }

  app.use(createErrorMiddleware({ logger: container.logger }));

  return { app, apiPrefix: API_PREFIX };
}
