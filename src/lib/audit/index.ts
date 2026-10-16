export * from './types';
export * from './uuid';
export * from './sanitizer';
export * from './tokens';
export * from './hash';
export * from './queue';
export * from './client';

/**
 * Extrai IP e User-Agent de um Request HTTP de forma segura.
 */
export function getRequestContext(request?: Request | null): { ip: string | null; userAgent: string | null } {
  if (!request) {
    return { ip: null, userAgent: null };
  }
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || null;
  const userAgent = request.headers.get('user-agent');
  return { ip, userAgent };
}

/**
 * Converte a sessão administrativa (AuthSession) em AuditActor canônico.
 */
export function sessionToAuditActor(session?: {
  user?: { id?: string; nome?: string; email?: string };
  role?: string | null;
  roleKey?: string | null;
} | null): import('./types').AuditActor {
  if (!session?.user) {
    return { type: 'anonymous' };
  }
  return {
    type: 'user',
    userId: session.user.id,
    name: session.user.nome || 'Usuário',
    email: session.user.email,
    role: session.roleKey || session.role || null,
  };
}

/**
 * Converte participante autenticado em AuditActor canônico.
 */
export function participantToAuditActor(participant?: {
  id?: string;
  name?: string;
  email?: string;
} | null): import('./types').AuditActor {
  if (!participant?.id) {
    return { type: 'anonymous', name: participant?.name };
  }
  return {
    type: 'user',
    userId: participant.id,
    name: participant.name || 'Participante',
    email: participant.email,
    role: 'participante',
  };
}

