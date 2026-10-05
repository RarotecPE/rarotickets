import { Router } from 'express';
import type { Request, RequestHandler, Response } from 'express';
import { sendHttpResponse } from '@server/api/http-router';
import { readRouteParam, readStringQuery, toHttpContext } from '@server/api/route-helpers';
import { requirePermission } from '@server/middlewares/auth.middleware';
import type { RegistrationController } from '../controllers/registration.controller';
import type { RegistrationAdminController } from '../controllers/registration-admin.controller';
import type {
  RegistrationActionRequest,
  RegistrationAdminActionRequest,
  RegistrationAdminListQuery,
} from '../dtos/registration.request.types';

export type RegistrationRouterDependencies = {
  controller: RegistrationController;
  adminController: RegistrationAdminController;
  authenticate: RequestHandler;
  authenticateParticipant: RequestHandler;
};

export function createRegistrationRouter(dependencies: RegistrationRouterDependencies): Router {
  const router = Router();
  const admin = [dependencies.authenticate];
  const participant = [dependencies.authenticateParticipant];
  const operator = [dependencies.authenticate, requirePermission('CHECKIN_PERFORM')];

  router.post('/registrations', async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<RegistrationActionRequest>(request, {
        action: 'register',
        body: (request.body ?? {}) as never,
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/registrations/:code', async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<RegistrationActionRequest>(request, {
        action: 'detail',
        code: readRouteParam(request, 'code'),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/registrations/:code/credential', ...participant, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<RegistrationActionRequest>(request, {
        action: 'credential',
        code: readRouteParam(request, 'code'),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/participant/registrations', ...participant, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<RegistrationActionRequest>(request, { action: 'mine' }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/participant/registrations/:code/cancel', ...participant, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<RegistrationActionRequest>(request, {
        action: 'cancelMine',
        code: readRouteParam(request, 'code'),
        body: { reason: (request.body?.reason as string | undefined) ?? undefined },
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/admin/registrations', ...admin, requirePermission('REGISTRATION_VIEW'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<RegistrationAdminActionRequest>(request, {
        action: 'list',
        query: readStringQuery<RegistrationAdminListQuery>(request),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/admin/registrations/:registrationId', ...admin, requirePermission('REGISTRATION_VIEW'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<RegistrationAdminActionRequest>(request, {
        action: 'detail',
        registrationId: readRouteParam(request, 'registrationId'),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/admin/registrations/:registrationId/cancel', ...admin, requirePermission('REGISTRATION_MANAGE'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<RegistrationAdminActionRequest>(request, {
        action: 'cancel',
        registrationId: readRouteParam(request, 'registrationId'),
        body: { reason: (request.body?.reason as string | undefined) ?? undefined },
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/admin/registrations/:registrationId/promote', ...admin, requirePermission('REGISTRATION_MANAGE'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<RegistrationAdminActionRequest>(request, {
        action: 'promote',
        registrationId: readRouteParam(request, 'registrationId'),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/admin/registrations/:registrationId/check-in', ...operator, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<RegistrationAdminActionRequest>(request, {
        action: 'checkIn',
        body: {
          registrationId: readRouteParam(request, 'registrationId'),
          override: request.body?.override === true,
          overrideReason: (request.body?.overrideReason as string | undefined) ?? null,
        },
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/check-in', ...operator, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<RegistrationAdminActionRequest>(request, {
        action: 'checkIn',
        body: {
          credentialToken: (request.body?.credentialToken as string | undefined) ?? null,
          code: (request.body?.code as string | undefined) ?? null,
          override: request.body?.override === true,
          overrideReason: (request.body?.overrideReason as string | undefined) ?? null,
        },
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/admin/events/:eventId/check-ins', ...admin, requirePermission('REGISTRATION_VIEW'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<RegistrationAdminActionRequest>(request, {
        action: 'checkIns',
        eventId: readRouteParam(request, 'eventId'),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/admin/registrations/expire-reservations', ...admin, requirePermission('REGISTRATION_MANAGE'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<RegistrationAdminActionRequest>(request, {
        action: 'expireReservations',
        body: { limit: request.body?.limit as number | undefined },
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  return router;
}

