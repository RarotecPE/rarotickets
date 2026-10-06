import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { HttpResponse } from '../../../../../server/api/http-response';
import { AUTH_COOKIE_NAMES, clearCookie, readCookie } from '../../../../../server/api/cookies';
import type { AppConfig } from '../../../../../server/config/app.config';
import type { ApplicationPermission } from '../../../domain/value-objects/application-role.vo';
import type { AuthSessionDto } from '../../../application/types/auth-session.types';
import { ResolveGlobalSessionController } from '../controllers/resolve-global-session.controller';
import { DemoSessionRegistry } from '../../infrastructure/session/demo-session.registry';

export type RequireAuthMiddlewareDependencies = {
  config: AppConfig;
  resolveSessionController: ResolveGlobalSessionController;
  demoSessionRegistry: DemoSessionRegistry;
};

export type RequirePermissionMiddlewareParams = { permission: ApplicationPermission };
type ResolveRequestSessionParams = {
  request: Request;
  response: Response;
  dependencies: RequireAuthMiddlewareDependencies;
};
type AuthSessionResponseBody = { data: { session: AuthSessionDto } };

export function createRequireAuthMiddleware(dependencies: RequireAuthMiddlewareDependencies): RequestHandler {
  return (request: Request, response: Response, next: NextFunction): void => {
    void resolveRequestSession({ request, response, dependencies })
      .then((shouldContinue) => {
        if (shouldContinue) next();
      })
      .catch(next);
  };
}

export function createRequirePermissionMiddleware(params: RequirePermissionMiddlewareParams): RequestHandler {
  return (_request: Request, response: Response, next: NextFunction): void => {
    const authContext = response.locals.authContext;
    if (!authContext) {
      response.status(401).json(HttpResponse.failure({ statusCode: 401, code: 'UNAUTHENTICATED', message: 'Entre para continuar.' }).body);
      return;
    }
    if (!authContext.session.permissions.includes(params.permission)) {
      response.status(403).json(HttpResponse.failure({ statusCode: 403, code: 'FORBIDDEN', message: 'Seu perfil não possui acesso a esta ação.' }).body);
      return;
    }
    next();
  };
}

async function resolveRequestSession(params: ResolveRequestSessionParams): Promise<boolean> {
  const { request, response, dependencies } = params;
  const demoToken = readCookie({ cookieHeader: request.headers.cookie, name: AUTH_COOKIE_NAMES.demoSession });
  if (dependencies.config.demoLoginEnabled && demoToken) {
    const demoSession = dependencies.demoSessionRegistry.find(demoToken);
    if (demoSession) {
      response.locals.authContext = { session: demoSession, globalToken: null, isDemo: true };
      return true;
    }
    clearCookie({ response, config: dependencies.config, name: AUTH_COOKIE_NAMES.demoSession });
  }

  const globalToken = readCookie({ cookieHeader: request.headers.cookie, name: AUTH_COOKIE_NAMES.globalSession });
  if (!globalToken) {
    response.status(401).json(HttpResponse.failure({ statusCode: 401, code: 'UNAUTHENTICATED', message: 'Entre para continuar.' }).body);
    return false;
  }
  const sessionResponse = await dependencies.resolveSessionController.handle({ token: globalToken });
  if (sessionResponse.statusCode === 200 && isSessionResponseBody(sessionResponse.body)) {
    response.locals.authContext = { session: sessionResponse.body.data.session, globalToken, isDemo: false };
    return true;
  }
  if (sessionResponse.statusCode === 401) {
    clearCookie({ response, config: dependencies.config, name: AUTH_COOKIE_NAMES.globalSession });
  }
  response.status(sessionResponse.statusCode).json(sessionResponse.body);
  return false;
}

function isSessionResponseBody(body: unknown): body is AuthSessionResponseBody {
  if (!body || typeof body !== 'object' || !('data' in body)) return false;
  const data = body.data;
  return Boolean(data && typeof data === 'object' && 'session' in data);
}
