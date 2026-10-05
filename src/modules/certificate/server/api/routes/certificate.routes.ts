import { Router } from 'express';
import type { Request, RequestHandler, Response } from 'express';
import { sendHttpResponse } from '@server/api/http-router';
import { readRouteParam, readStringQuery, toHttpContext } from '@server/api/route-helpers';
import { requirePermission } from '@server/middlewares/auth.middleware';
import type { CertificateController } from '../controllers/certificate.controller';
import type { CertificateActionRequest, CertificateListQuery } from '../dtos/certificate.request.types';

export type CertificateRouterDependencies = {
  controller: CertificateController;
  authenticate: RequestHandler;
  authenticateParticipant: RequestHandler;
};

export function createCertificateRouter(dependencies: CertificateRouterDependencies): Router {
  const router = Router();
  const admin = [dependencies.authenticate];
  const participant = [dependencies.authenticateParticipant];

  // Consulta pública de autenticidade (§31).
  router.get('/certificates/:code/validate', async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<CertificateActionRequest>(request, {
        action: 'validate',
        code: readRouteParam(request, 'code'),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/certificates/:code', async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<CertificateActionRequest>(request, {
        action: 'detail',
        code: readRouteParam(request, 'code'),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/participant/certificates', ...participant, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<CertificateActionRequest>(request, { action: 'mine' }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/admin/certificates', ...admin, requirePermission('CERTIFICATE_ISSUE'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<CertificateActionRequest>(request, {
        action: 'list',
        query: readStringQuery<CertificateListQuery>(request),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/admin/registrations/:registrationId/certificate', ...admin, requirePermission('CERTIFICATE_ISSUE'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<CertificateActionRequest>(request, {
        action: 'issue',
        registrationId: readRouteParam(request, 'registrationId'),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/admin/certificates/:certificateId/revoke', ...admin, requirePermission('CERTIFICATE_ISSUE'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<CertificateActionRequest>(request, {
        action: 'revoke',
        certificateId: readRouteParam(request, 'certificateId'),
        body: { reason: request.body?.reason as string | undefined },
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  return router;
}
