import type { Request } from 'express';
import type { HttpRequestContext } from './http-request.types';
import { readActor, readSessionToken } from '@server/middlewares/auth.middleware';
import { resolveRequestIp } from '@server/middlewares/request-context.middleware';

/** Monta o contexto HTTP consumido pelos controllers a partir do request Express. */
export function toHttpContext<Body>(request: Request, body: Body): HttpRequestContext<Body> {
  return {
    body,
    params: request.params as Record<string, string>,
    query: request.query as Record<string, unknown>,
    actor: readActor(request),
    participant: (request.app.locals as { participant?: HttpRequestContext['participant'] }).participant ?? null,
    ip: resolveRequestIp(request),
    sessionToken: readSessionToken(request),
  };
}

/** Lê a querystring reduzindo cada valor a uma string simples (Express 5). */
export function readStringQuery<Query extends object>(request: Request): Query {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(request.query)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (typeof single === 'string') query[key] = single;
  }
  return query as Query;
}

/**
 * Lê um parâmetro de rota. No Express 5 um parâmetro pode chegar como lista
 * (rotas com repetição); controllers sempre recebem string.
 */
export function readRouteParam(request: Request, name: string): string {
  const value = (request.params as Record<string, string | string[] | undefined>)[name];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}
