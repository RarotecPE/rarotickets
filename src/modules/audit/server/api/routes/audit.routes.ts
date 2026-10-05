import { Router } from 'express';
import type { Request, RequestHandler, Response } from 'express';
import { sendHttpResponse } from '@server/api/http-router';
import { readStringQuery, toHttpContext } from '@server/api/route-helpers';
import { requirePermission } from '@server/middlewares/auth.middleware';
import type { AuditController } from '../controllers/audit.controller';
import type { AuditActionRequest, ListAuditEntriesQuery } from '../dtos/audit.request.types';

export type AuditRouterDependencies = { controller: AuditController; authenticate: RequestHandler };

/** Trilha de auditoria (§36) — somente ADMINISTRADOR/AUDIT_VIEW. */
export function createAuditRouter(dependencies: AuditRouterDependencies): Router {
  const router = Router();

  router.get('/admin/audit-logs', dependencies.authenticate, requirePermission('AUDIT_VIEW'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<AuditActionRequest>(request, {
        action: 'list',
        query: readStringQuery<ListAuditEntriesQuery>(request),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  return router;
}
