import type { RequestHandler } from 'express';
import type { AsyncRouteHandler } from '../../modules/auth/server/api/middlewares/auth-route.types';

export function asyncRoute(handler: AsyncRouteHandler): RequestHandler {
  return (request, response, next): void => {
    void handler(request, response, next).catch(next);
  };
}
