import { Router } from 'express';
import type { Request, RequestHandler, Response } from 'express';
import { sendHttpResponse } from '@server/api/http-router';
import { readRouteParam, readStringQuery, toHttpContext } from '@server/api/route-helpers';
import { requirePermission } from '@server/middlewares/auth.middleware';
import type { ParticipantController } from '../controllers/participant.controller';
import type { ParticipantActionRequest, ParticipantAdminListQuery } from '../dtos/participant.request.types';

export type ParticipantRouterDependencies = {
  controller: ParticipantController;
  authenticate: RequestHandler;
  authenticateParticipant: RequestHandler;
};

export function createParticipantRouter(dependencies: ParticipantRouterDependencies): Router {
  const router = Router();
  const admin = [dependencies.authenticate];
  const participant = [dependencies.authenticateParticipant];

  router.post('/participant/session', async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<ParticipantActionRequest>(request, {
        action: 'openSession',
        body: { email: request.body?.email as string | undefined, cpf: request.body?.cpf as string | undefined },
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.delete('/participant/session', ...participant, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<ParticipantActionRequest>(request, {
        action: 'closeSession',
        token: (request.cookies as Record<string, string> | undefined)?.rarotickets_participant_session ?? null,
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/participant/me', ...participant, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<ParticipantActionRequest>(request, { action: 'me' }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.put('/participant/me', ...participant, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<ParticipantActionRequest>(request, {
        action: 'updateProfile',
        body: (request.body ?? {}) as never,
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/participant/consents', ...participant, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<ParticipantActionRequest>(request, {
        action: 'registerConsents',
        body: { consents: request.body?.consents as never },
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/admin/participants', ...admin, requirePermission('PARTICIPANT_VIEW'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<ParticipantActionRequest>(request, {
        action: 'list',
        query: readStringQuery<ParticipantAdminListQuery>(request),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/admin/participants/:participantId', ...admin, requirePermission('PARTICIPANT_VIEW'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.controller.handle(
      toHttpContext<ParticipantActionRequest>(request, {
        action: 'detail',
        participantId: readRouteParam(request, 'participantId'),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  return router;
}
