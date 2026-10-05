import type { NextFunction, Request, Response } from 'express';
import { HttpResponse } from '@server/api/http-response';
import type { ParticipantActor } from '@server/api/http-request.types';
import type { ILogger } from '@server/infrastructure/logger/logger';

export type ParticipantSessionResolver = (params: {
  token: string;
  at: Date;
}) => Promise<ParticipantActor | null>;

export type ParticipantAuthMiddlewareDependencies = {
  resolveParticipantSession: ParticipantSessionResolver;
  logger: ILogger;
  cookieName?: string;
};

/**
 * Autentica o participante na área restrita (§32). A sessão é independente da
 * sessão interna (usuários da equipe) e identifica o próprio participante.
 */
export function createParticipantAuthMiddleware(dependencies: ParticipantAuthMiddlewareDependencies) {
  const cookieName = dependencies.cookieName ?? 'rarotickets_participant_session';

  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const cookies = request.cookies as Record<string, string> | undefined;
    const token = cookies?.[cookieName];
    if (!token) {
      response.status(401).json(HttpResponse.unauthorized('Sessão de participante necessária', 'PARTICIPANT_UNAUTHORIZED').body);
      return;
    }

    try {
      const participant = await dependencies.resolveParticipantSession({ token, at: new Date() });
      if (!participant) {
        response.status(401).json(HttpResponse.unauthorized('Sessão de participante inválida ou expirada', 'PARTICIPANT_UNAUTHORIZED').body);
        return;
      }
      (request.app.locals as { participant?: ParticipantActor }).participant = participant;
      next();
    } catch (error) {
      dependencies.logger.error('Falha ao resolver sessão do participante', {
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  };
}
