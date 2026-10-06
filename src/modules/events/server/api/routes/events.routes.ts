import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncRoute } from '../../../../../server/api/async-route.util';
import { HttpResponse } from '../../../../../server/api/http-response';
import type { AppConfig } from '../../../../../server/config/app.config';
import { createRequireAuthMiddleware, createRequirePermissionMiddleware } from '../../../../auth/server/api/middlewares/require-auth.middleware';
import { DemoSessionRegistry } from '../../../../auth/server/infrastructure/session/demo-session.registry';
import { ResolveGlobalSessionController } from '../../../../auth/server/api/controllers/resolve-global-session.controller';
import { CreateEventController } from '../controllers/create-event.controller';
import { ListEventsController } from '../controllers/list-events.controller';
import { UpdateEventStatusController } from '../controllers/update-event-status.controller';
import type { CreateEventRequestDto } from '../dtos/create-event.request.dto';
import type { UpdateEventStatusRequestDto } from '../dtos/update-event-status.request.dto';

export type EventRouterDependencies = {
  config: AppConfig;
  demoSessionRegistry: DemoSessionRegistry;
  resolveSessionController: ResolveGlobalSessionController;
  createEventController: CreateEventController;
  listEventsController: ListEventsController;
  updateEventStatusController: UpdateEventStatusController;
};
type ListEventsRouteParams = { response: Response; dependencies: EventRouterDependencies };
type EventRequestRouteParams = { request: Request; response: Response; dependencies: EventRouterDependencies };
type ReadTextParams = { value: unknown; maximumLength: number };
type ReadOptionalTextParams = ReadTextParams;

export function createEventsRouter(dependencies: EventRouterDependencies): Router {
  const router = Router();
  const requireAuth = createRequireAuthMiddleware({
    config: dependencies.config,
    resolveSessionController: dependencies.resolveSessionController,
    demoSessionRegistry: dependencies.demoSessionRegistry,
  });
  const canReadEvents = createRequirePermissionMiddleware({ permission: 'events:read' });
  const canCreateEvents = createRequirePermissionMiddleware({ permission: 'events:create' });
  const canUpdateEvents = createRequirePermissionMiddleware({ permission: 'events:update' });

  router.get('/', requireAuth, canReadEvents, asyncRoute((_request, response) => listEvents({ response, dependencies })));
  router.post('/', requireAuth, canCreateEvents, asyncRoute((request, response) => createEvent({ request, response, dependencies })));
  router.patch('/:eventId/status', requireAuth, canUpdateEvents, asyncRoute((request, response) => updateEventStatus({ request, response, dependencies })));
  return router;
}

async function listEvents(params: ListEventsRouteParams): Promise<void> {
  const result = await params.dependencies.listEventsController.handle({});
  params.response.setHeader('Cache-Control', 'no-store');
  params.response.status(result.statusCode).json(result.body);
}

async function createEvent(params: EventRequestRouteParams): Promise<void> {
  const body = parseCreateEventRequest(params.request.body as unknown);
  const authContext = params.response.locals.authContext;
  if (!body || !authContext) {
    params.response.status(400).json(HttpResponse.failure({ statusCode: 400, code: 'INVALID_REQUEST', message: 'Revise os dados do evento e tente novamente.' }).body);
    return;
  }
  const result = await params.dependencies.createEventController.handle({ body, createdById: authContext.session.user.id });
  params.response.status(result.statusCode).json(result.body);
}

async function updateEventStatus(params: EventRequestRouteParams): Promise<void> {
  const body = parseUpdateStatusRequest(params.request.body as unknown);
  const authContext = params.response.locals.authContext;
  if (!body || !authContext) {
    params.response.status(400).json(HttpResponse.failure({ statusCode: 400, code: 'INVALID_REQUEST', message: 'A situação informada é inválida.' }).body);
    return;
  }
  if (body.status === 'CANCELADO' && !authContext.session.permissions.includes('events:cancel')) {
    params.response.status(403).json(HttpResponse.failure({ statusCode: 403, code: 'FORBIDDEN', message: 'Seu perfil não pode cancelar eventos.' }).body);
    return;
  }
  const eventId = params.request.params.eventId;
  if (typeof eventId !== 'string') {
    params.response.status(400).json(HttpResponse.failure({ statusCode: 400, code: 'INVALID_REQUEST', message: 'O identificador do evento é inválido.' }).body);
    return;
  }
  const result = await params.dependencies.updateEventStatusController.handle({ eventId, body });
  params.response.status(result.statusCode).json(result.body);
}

function parseCreateEventRequest(value: unknown): CreateEventRequestDto | null {
  if (!isRecord(value)) return null;
  const title = readText({ value: value.title, maximumLength: 120 });
  const shortDescription = readText({ value: value.shortDescription, maximumLength: 240 });
  const description = readOptionalText({ value: value.description, maximumLength: 5000 });
  const startAt = readText({ value: value.startAt, maximumLength: 60 });
  const endAt = readText({ value: value.endAt, maximumLength: 60 });
  const location = readText({ value: value.location, maximumLength: 500 });
  const eventType = value.eventType;
  const priceCents = value.priceCents;
  const capacity = value.capacity;
  const modality = value.modality;
  if (!title || !shortDescription || description === null || !startAt || !endAt || !location) return null;
  if (!isEventType(eventType) || !isEventModality(modality) || !isValidCapacity(capacity)) return null;
  if (typeof priceCents !== 'number' || !Number.isInteger(priceCents)) return null;
  return { title, shortDescription, description, eventType, priceCents, startAt, endAt, capacity, modality, location };
}

function isEventType(value: unknown): value is CreateEventRequestDto['eventType'] {
  return value === 'GRATUITO' || value === 'PAGO';
}

function isEventModality(value: unknown): value is CreateEventRequestDto['modality'] {
  return value === 'PRESENCIAL' || value === 'ONLINE';
}

function isValidCapacity(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isInteger(value));
}

function parseUpdateStatusRequest(value: unknown): UpdateEventStatusRequestDto | null {
  if (!isRecord(value)) return null;
  const status = readText({ value: value.status, maximumLength: 40 });
  return status ? { status } : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readText(params: ReadTextParams): string | null {
  if (typeof params.value !== 'string' || params.value.trim().length === 0 || params.value.length > params.maximumLength) return null;
  return params.value.trim();
}

function readOptionalText(params: ReadOptionalTextParams): string | null {
  if (params.value === undefined || params.value === null) return '';
  if (typeof params.value !== 'string' || params.value.length > params.maximumLength) return null;
  return params.value.trim();
}
