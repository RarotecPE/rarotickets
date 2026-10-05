import type { NextFunction, Request, Response } from 'express';
import { ALL_PERMISSIONS } from '@core/domain/permissions';
import type { Permission } from '@core/domain/permissions';
import { HttpResponse } from '@server/api/http-response';
import type { RequestActor } from '@server/api/http-request.types';
import type { ILogger } from '@server/infrastructure/logger/logger';

export type SessionResolver = (params: { token: string; at: Date }) => Promise<RequestActor | null>;

export type AuthMiddlewareDependencies = {
  resolveSession: SessionResolver;
  logger: ILogger;
};

/** Autentica o usuário interno a partir do cookie de sessão. */
export function createAuthMiddleware(dependencies: AuthMiddlewareDependencies) {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const token = readSessionToken(request);
    if (!token) {
      response.status(401).json(HttpResponse.unauthorized().body);
      return;
    }

    try {
      const actor = await dependencies.resolveSession({ token, at: new Date() });
      if (!actor) {
        response.status(401).json(HttpResponse.unauthorized().body);
        return;
      }
      (request.app.locals as { actor?: RequestActor }).actor = actor;
      next();
    } catch (error) {
      dependencies.logger.error('Falha ao resolver sessão', {
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  };
}

/** Restringe a ação às permissões informadas (§35). */
export function requirePermission(permission: Permission) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const actor = (request.app.locals as { actor?: RequestActor }).actor;
    if (!actor) {
      response.status(401).json(HttpResponse.unauthorized().body);
      return;
    }
    const permissions = actor.permissions.filter((item) => ALL_PERMISSIONS.includes(item as Permission));
    if (!permissions.includes(permission)) {
      response
        .status(403)
        .json(
          HttpResponse.forbidden(`Permissão ${permission} é necessária para esta operação`, 'INSUFFICIENT_PERMISSION')
            .body,
        );
      return;
    }
    next();
  };
}

export function readActor(request: Request): RequestActor | null {
  return ((request.app.locals as { actor?: RequestActor }).actor ?? null);
}

export function readSessionToken(request: Request): string | null {
  const cookieName = (request.app.locals as { sessionCookieName?: string }).sessionCookieName ?? 'rarotickets_session';
  const cookies = request.cookies as Record<string, string> | undefined;
  return cookies?.[cookieName] ?? null;
}
