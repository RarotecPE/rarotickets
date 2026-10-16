import { createHmac } from 'crypto';
import type { AuditEnvelope } from './types';

/**
 * Ordena recursivamente as chaves de um objeto para garantir JSON canônico determinístico.
 */
function canonicalStringify(obj: unknown): string {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => canonicalStringify(item)).join(',') + ']';
  }

  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const entries = keys.map(
    (key) => JSON.stringify(key) + ':' + canonicalStringify((obj as Record<string, unknown>)[key]),
  );

  return '{' + entries.join(',') + '}';
}

/**
 * Calcula o hash HMAC-SHA256 à prova de adulteração do envelope de auditoria.
 */
export function computeEnvelopeHash(
  envelope: Omit<AuditEnvelope, 'hash'>,
  secret = process.env.AUDIT_SYSTEM_SECRET || 'rarotickets-default-audit-secret-key-32b',
): string {
  const { hash: _omitted, ...canonicalPayload } = envelope as Record<string, unknown>;
  const serialized = canonicalStringify(canonicalPayload);
  return createHmac('sha256', secret).update(serialized).digest('hex');
}

