import { Router } from 'express';
import type { Request, RequestHandler, Response } from 'express';
import { sendHttpResponse } from '@server/api/http-router';
import { toHttpContext } from '@server/api/route-helpers';
import type { AuthActionRequest } from '../dtos/auth.request.dto';
import type { AuthController } from '../controllers/auth.controller';

export type AuthRouterDependencies = {
  controller: AuthController;
  authenticate: RequestHandler;
};

export function createAuthRouter(dependencies: AuthRouterDependencies): Router {
  const router = Router();

  router.post('/auth/login', async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle({
      ...toHttpContext<AuthActionRequest>(request, { action: 'login', ...(request.body ?? {}) }),
      actor: null,
    });
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/auth/logout', async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<AuthActionRequest>(request, { action: 'logout' }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/auth/me', dependencies.authenticate, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<AuthActionRequest>(request, { action: 'me' }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  return router;
}
