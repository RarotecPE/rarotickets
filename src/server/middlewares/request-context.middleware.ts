import type { NextFunction, Request, Response } from 'express';

export type RequestLocals = {
  actor?: {
    userId: string;
    name: string;
    email: string;
    role: string;
    permissions: string[];
  };
  participant?: { participantId: string; name: string; email: string };
};

/** Disponibiliza IP e dados básicos de requisição para os controllers. */
export function requestContextMiddleware(request: Request, _response: Response, next: NextFunction): void {
  const forwarded = request.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  request.app.locals.requestIp = (forwardedIp ?? request.ip ?? request.socket.remoteAddress ?? '').trim();
  next();
}

export function resolveRequestIp(request: Request): string | null {
  const ip = (request.app.locals as { requestIp?: string }).requestIp;
  return ip && ip.length > 0 ? ip : null;
}
