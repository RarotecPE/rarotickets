import { Router } from 'express';
import type { Request, RequestHandler, Response } from 'express';
import { sendHttpResponse } from '@server/api/http-router';
import { readRouteParam, readStringQuery, toHttpContext } from '@server/api/route-helpers';
import { requirePermission } from '@server/middlewares/auth.middleware';
import type { ReportController } from '../controllers/report.controller';
import type { ReportActionRequest, ReportQuery } from '../dtos/report.request.types';

export type ReportRouterDependencies = {
  controller: ReportController;
  authenticate: RequestHandler;
};

export function createReportRouter(dependencies: ReportRouterDependencies): Router {
  const router = Router();
  const admin = [dependencies.authenticate, requirePermission('REPORT_VIEW')];

  router.get('/admin/dashboard', ...admin, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<ReportActionRequest>(request, {
        action: 'dashboard',
        query: readStringQuery<ReportQuery>(request),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/admin/reports/:reportKey', ...admin, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<ReportActionRequest>(request, {
        action: 'report',
        reportKey: readRouteParam(request, 'reportKey'),
        query: readStringQuery<ReportQuery>(request),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  return router;
}
