import { Router } from 'express';
import type { Request, RequestHandler, Response } from 'express';
import { sendHttpResponse } from '@server/api/http-router';
import { readStringQuery, toHttpContext } from '@server/api/route-helpers';
import { requirePermission } from '@server/middlewares/auth.middleware';
import type { CheckInController } from '../controllers/checkin.controller';
import type { CheckInActionRequest, CheckInBoardQuery, CheckInLookupQuery } from '../dtos/checkin.request.types';

export type CheckInRouterDependencies = { controller: CheckInController; authenticate: RequestHandler };

/** Credenciamento operado por quem possui CHECKIN_PERFORM (§29). */
export function createCheckInRouter(dependencies: CheckInRouterDependencies): Router {
  const router = Router();
  const operator = [dependencies.authenticate, requirePermission('CHECKIN_PERFORM')];

  router.get('/admin/check-ins', ...operator, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<CheckInActionRequest>(request, {
        action: 'board',
        query: readStringQuery<CheckInBoardQuery>(request),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/admin/check-ins/lookup', ...operator, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<CheckInActionRequest>(request, {
        action: 'lookup',
        query: readStringQuery<CheckInLookupQuery>(request),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  return router;
}
