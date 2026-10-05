import { Router } from 'express';
import type { Request, RequestHandler, Response } from 'express';
import { sendHttpResponse } from '@server/api/http-router';
import { readRouteParam, readStringQuery, toHttpContext } from '@server/api/route-helpers';
import { requirePermission } from '@server/middlewares/auth.middleware';
import type { ListUsersQuery, UserActionRequest } from '../dtos/user.request.types';
import type { UserController } from '../controllers/user.controller';

export type UserRouterDependencies = { controller: UserController; authenticate: RequestHandler };

export function createUserRouter(dependencies: UserRouterDependencies): Router {
  const router = Router();
  const guards = [dependencies.authenticate, requirePermission('USER_MANAGE')];

  router.get('/users', ...guards, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<UserActionRequest>(request, {
        action: 'list',
        query: readStringQuery<ListUsersQuery>(request),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/users', ...guards, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<UserActionRequest>(request, { action: 'create', body: request.body ?? {} }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.put('/users/:userId', ...guards, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<UserActionRequest>(request, {
        action: 'update',
        userId: readRouteParam(request, 'userId'),
        body: request.body ?? {},
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  return router;
}

