import express from 'express';
import type { Express, RequestHandler } from 'express';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { AuthSessionMapper } from '../../modules/auth/application/mappers/auth-session.mapper';
import { CompleteRaroNexusLoginUseCase } from '../../modules/auth/application/use-cases/complete-raro-nexus-login/complete-raro-nexus-login.use-case';
import { ResolveGlobalSessionUseCase } from '../../modules/auth/application/use-cases/resolve-global-session/resolve-global-session.use-case';
import { RevokeGlobalSessionUseCase } from '../../modules/auth/application/use-cases/revoke-global-session/revoke-global-session.use-case';
import { ListAuthorizedApplicationsUseCase } from '../../modules/auth/application/use-cases/list-authorized-applications/list-authorized-applications.use-case';
import { CompleteRaroNexusLoginController } from '../../modules/auth/server/api/controllers/complete-raro-nexus-login.controller';
import { ResolveGlobalSessionController } from '../../modules/auth/server/api/controllers/resolve-global-session.controller';
import { RevokeGlobalSessionController } from '../../modules/auth/server/api/controllers/revoke-global-session.controller';
import { ListAuthorizedApplicationsController } from '../../modules/auth/server/api/controllers/list-authorized-applications.controller';
import { RaroNexusApiProvider } from '../../modules/auth/server/infrastructure/providers/raro-nexus-api.provider';
import { DemoSessionRegistry } from '../../modules/auth/server/infrastructure/session/demo-session.registry';
import { createAuthRouter } from '../../modules/auth/server/api/routes/auth.routes';
import { EventMapper } from '../../modules/events/application/mappers/event.mapper';
import { CreateEventUseCase } from '../../modules/events/application/use-cases/create-event/create-event.use-case';
import { ListEventsUseCase } from '../../modules/events/application/use-cases/list-events/list-events.use-case';
import { UpdateEventStatusUseCase } from '../../modules/events/application/use-cases/update-event-status/update-event-status.use-case';
import { CreateEventController } from '../../modules/events/server/api/controllers/create-event.controller';
import { ListEventsController } from '../../modules/events/server/api/controllers/list-events.controller';
import { UpdateEventStatusController } from '../../modules/events/server/api/controllers/update-event-status.controller';
import { createEventsRouter } from '../../modules/events/server/api/routes/events.routes';
import { ParticipantMapper } from '../../modules/participants/application/mappers/participant.mapper';
import { RegisterParticipantUseCase } from '../../modules/participants/application/use-cases/register-participant/register-participant.use-case';
import { LoginParticipantUseCase } from '../../modules/participants/application/use-cases/login-participant/login-participant.use-case';
import { GetParticipantAccountUseCase } from '../../modules/participants/application/use-cases/get-participant-account/get-participant-account.use-case';
import { RegisterParticipantController } from '../../modules/participants/server/api/controllers/register-participant.controller';
import { LoginParticipantController } from '../../modules/participants/server/api/controllers/login-participant.controller';
import { GetParticipantAccountController } from '../../modules/participants/server/api/controllers/get-participant-account.controller';
import { createParticipantAuthRouter } from '../../modules/participants/server/api/routes/participant-auth.routes';
import { ParticipantSessionRegistry } from '../../modules/participants/server/infrastructure/session/participant-session.registry';
import { ScryptParticipantPasswordHasher } from '../../modules/participants/server/infrastructure/providers/scrypt-participant-password-hasher.provider';
import { ParticipantPersistenceMapper } from '../../modules/participants/server/infrastructure/persistence/mappers/participant-persistence.mapper';
import { JsonParticipantRepositoryImpl } from '../../modules/participants/server/infrastructure/persistence/repositories/json-participant.repository.impl';
import { EventPersistenceMapper } from '../../modules/events/server/infrastructure/persistence/mappers/event-persistence.mapper';
import { JsonEventRepositoryImpl } from '../../modules/events/server/infrastructure/persistence/repositories/json-event.repository.impl';
import { DEMO_EVENT_RECORDS } from '../../modules/events/server/infrastructure/persistence/seed-events';
import { httpErrorMiddleware } from '../api/http-error.middleware';
import { HttpResponse } from '../api/http-response';
import type { AppConfig } from '../config/app.config';

export type CreateApplicationParams = { config: AppConfig };
type ServeProductionClientParams = { app: Express };

export async function createApplication(params: CreateApplicationParams): Promise<Express> {
  const { config } = params;
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use(setSecurityHeaders);
  app.use(setApiCacheHeaders);

  const authSessionMapper = new AuthSessionMapper();
  const raronexusProvider = new RaroNexusApiProvider({
    settings: config.raronexus,
    requestTimeoutMs: config.raronexusRequestTimeoutMs,
  });
  const completeLoginUseCase = new CompleteRaroNexusLoginUseCase({ provider: raronexusProvider, mapper: authSessionMapper });
  const resolveSessionUseCase = new ResolveGlobalSessionUseCase({ provider: raronexusProvider, mapper: authSessionMapper });
  const revokeSessionUseCase = new RevokeGlobalSessionUseCase({ provider: raronexusProvider });
  const listApplicationsUseCase = new ListAuthorizedApplicationsUseCase({
    provider: raronexusProvider,
    ownClientId: config.raronexus.clientId ?? '',
  });
  const completeLoginController = new CompleteRaroNexusLoginController({ useCase: completeLoginUseCase });
  const resolveSessionController = new ResolveGlobalSessionController({ useCase: resolveSessionUseCase });
  const revokeSessionController = new RevokeGlobalSessionController({ useCase: revokeSessionUseCase });
  const listApplicationsController = new ListAuthorizedApplicationsController({ useCase: listApplicationsUseCase });
  const demoSessionRegistry = new DemoSessionRegistry({ mapper: authSessionMapper });

  const participantMapper = new ParticipantMapper();
  const participantPersistenceMapper = new ParticipantPersistenceMapper();
  const participantRepository = new JsonParticipantRepositoryImpl({
    filePath: join(config.dataDirectory, 'participants.json'),
    mapper: participantPersistenceMapper,
  });
  await participantRepository.initialize();
  const participantPasswordHasher = new ScryptParticipantPasswordHasher();
  const participantSessionRegistry = new ParticipantSessionRegistry();
  const registerParticipantUseCase = new RegisterParticipantUseCase({
    participantRepository,
    passwordHasher: participantPasswordHasher,
    participantMapper,
  });
  const loginParticipantUseCase = new LoginParticipantUseCase({
    participantRepository,
    passwordHasher: participantPasswordHasher,
    participantMapper,
  });
  const getParticipantAccountUseCase = new GetParticipantAccountUseCase({ participantRepository, participantMapper });
  const registerParticipantController = new RegisterParticipantController({ useCase: registerParticipantUseCase });
  const loginParticipantController = new LoginParticipantController({ useCase: loginParticipantUseCase });
  const getParticipantAccountController = new GetParticipantAccountController({ useCase: getParticipantAccountUseCase });

  const eventMapper = new EventMapper();
  const eventPersistenceMapper = new EventPersistenceMapper();
  const eventRepository = new JsonEventRepositoryImpl({
    filePath: join(config.dataDirectory, 'events.json'),
    mapper: eventPersistenceMapper,
    initialRecords: config.demoLoginEnabled ? DEMO_EVENT_RECORDS : [],
  });
  await eventRepository.initialize();
  const createEventUseCase = new CreateEventUseCase({ eventRepository, eventMapper });
  const listEventsUseCase = new ListEventsUseCase({ eventRepository, eventMapper });
  const updateEventStatusUseCase = new UpdateEventStatusUseCase({ eventRepository, eventMapper });
  const createEventController = new CreateEventController({ useCase: createEventUseCase });
  const listEventsController = new ListEventsController({ useCase: listEventsUseCase });
  const updateEventStatusController = new UpdateEventStatusController({ useCase: updateEventStatusUseCase });

  app.get('/api/health', (_request, response) => response.json({ data: { status: 'ok' } }));
  app.use('/api/auth', createAuthRouter({
    config,
    completeLoginController,
    resolveSessionController,
    revokeSessionController,
    listApplicationsController,
    demoSessionRegistry,
  }));
  app.use('/api/participants/auth', createParticipantAuthRouter({
    config,
    registerParticipantController,
    loginParticipantController,
    getParticipantAccountController,
    sessionRegistry: participantSessionRegistry,
  }));
  app.use('/api/events', createEventsRouter({
    config,
    demoSessionRegistry,
    resolveSessionController,
    createEventController,
    listEventsController,
    updateEventStatusController,
  }));
  app.use('/api', (_request, response) => {
    response.status(404).json(HttpResponse.failure({ statusCode: 404, code: 'NOT_FOUND', message: 'Rota não encontrada.' }).body);
  });

  if (config.isProduction) serveProductionClient({ app });
  app.use(httpErrorMiddleware);
  return app;
}

const setSecurityHeaders: RequestHandler = (_request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'same-origin');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
};

const setApiCacheHeaders: RequestHandler = (request, response, next) => {
  if (request.path.startsWith('/api/')) response.setHeader('Cache-Control', 'no-store');
  next();
};

function serveProductionClient(params: ServeProductionClientParams): void {
  const buildDirectory = resolve(process.cwd(), 'dist');
  if (!existsSync(buildDirectory)) return;
  params.app.use(express.static(buildDirectory, { index: false, maxAge: '1h' }));
  params.app.get('*', (_request, response) => response.sendFile(join(buildDirectory, 'index.html')));
}
