import { Redis } from '@upstash/redis';
import type { AuditEnvelope } from './types';

let redisInstance: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redisInstance) {
    return redisInstance;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  try {
    redisInstance = new Redis({ url, token });
    return redisInstance;
  } catch (error) {
    console.error('[AuditQueue] Falha ao inicializar Upstash Redis:', error);
    return null;
  }
}

/**
 * Publica um evento canônico de auditoria no Stream Upstash Redis `audit_events_stream`.
 * É seguro e não bloqueia a resposta se o Redis estiver indisponível.
 */
export async function enqueueAuditEvent(envelope: AuditEnvelope): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[AuditQueue] Upstash Redis não configurado. Evento registrado apenas localmente:', envelope.action);
    }
    return false;
  }

  try {
    const streamKey = 'audit_events_stream';
    const payload = JSON.stringify(envelope);

    await redis.xadd(streamKey, '*', {
      id: envelope._id,
      system: envelope.system,
      action: envelope.action,
      severity: envelope.severity,
      payload,
    });

    return true;
  } catch (error) {
    console.error('[AuditQueue] Erro ao enviar evento para o Upstash Redis:', error);
    return false;
  }
}

