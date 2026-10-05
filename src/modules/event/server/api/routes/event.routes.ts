import { Router } from 'express';
import type { Request, RequestHandler, Response } from 'express';
import { sendHttpResponse } from '@server/api/http-router';
import { readRouteParam, readStringQuery, toHttpContext } from '@server/api/route-helpers';
import { requirePermission } from '@server/middlewares/auth.middleware';
import type { ListEventsQuery, PublicEventRequest } from '../dtos/event.request.types';
import type { EventAdminRequest } from '../dtos/event.request.types';
import type { PublicEventController } from '../controllers/public-event.controller';
import type { EventAdminController } from '../controllers/event-admin.controller';

export type EventRouterDependencies = {
  publicController: PublicEventController;
  adminController: EventAdminController;
  authenticate: RequestHandler;
};

export function createEventRouter(dependencies: EventRouterDependencies): Router {
  const router = Router();
  const admin = [dependencies.authenticate];

  router.get('/events', async (request: Request, response: Response) => {
    const httpResponse = await dependencies.publicController.handle(
      toHttpContext<PublicEventRequest>(request, { action: 'list', query: readStringQuery<ListEventsQuery>(request) }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/events/:slug', async (request: Request, response: Response) => {
    const httpResponse = await dependencies.publicController.handle(
      toHttpContext<PublicEventRequest>(request, {
        action: 'detail',
        slug: readRouteParam(request, 'slug'),
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/admin/events', ...admin, requirePermission('EVENT_UPDATE'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<EventAdminRequest>(request, { action: 'list', query: readStringQuery<ListEventsQuery>(request) }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.get('/admin/events/:eventId', ...admin, requirePermission('EVENT_UPDATE'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<EventAdminRequest>(request, { action: 'detail', eventId: readRouteParam(request, 'eventId') }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/admin/events', ...admin, requirePermission('EVENT_CREATE'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<EventAdminRequest>(request, { action: 'create', body: request.body ?? {} }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.put('/admin/events/:eventId', ...admin, requirePermission('EVENT_UPDATE'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<EventAdminRequest>(request, {
        action: 'update',
        eventId: readRouteParam(request, 'eventId'),
        body: request.body ?? {},
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/admin/events/:eventId/status', ...admin, async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<EventAdminRequest>(request, {
        action: 'changeStatus',
        eventId: readRouteParam(request, 'eventId'),
        body: request.body ?? {},
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.put('/admin/events/:eventId/form', ...admin, requirePermission('EVENT_UPDATE'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<EventAdminRequest>(request, {
        action: 'saveForm',
        eventId: readRouteParam(request, 'eventId'),
        body: { fields: request.body?.fields ?? [] },
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/admin/events/:eventId/lotes', ...admin, requirePermission('EVENT_UPDATE'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<EventAdminRequest>(request, {
        action: 'manageLote',
        eventId: readRouteParam(request, 'eventId'),
        body: request.body ?? {},
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  router.post('/admin/events/:eventId/program', ...admin, requirePermission('EVENT_UPDATE'), async (request: Request, response: Response) => {
    const httpResponse = await dependencies.adminController.handle(
      toHttpContext<EventAdminRequest>(request, {
        action: 'manageProgram',
        eventId: readRouteParam(request, 'eventId'),
        body: request.body ?? {},
      }),
    );
    sendHttpResponse({ response, httpResponse });
  });

  return router;
}

