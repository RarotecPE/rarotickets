import type { AuditEnvelope, AuditEnvelopeInput } from './types';
import { generateUuidV7 } from './uuid';
import { sanitizeValue } from './sanitizer';
import { extractSearchTokens } from './tokens';
import { computeEnvelopeHash } from './hash';
import { enqueueAuditEvent } from './queue';

export class AuditClient {
  private readonly defaultSystem = 'rarotickets';

  /**
   * Constrói o envelope canônico completo de auditoria.
   */
  public buildEnvelope(input: AuditEnvelopeInput): AuditEnvelope {
    const _id = generateUuidV7();
    const timestamp = new Date().toISOString();

    const sanitizedDetails = input.details
      ? (sanitizeValue(input.details) as Record<string, unknown>)
      : undefined;

    let sanitizedDiff: AuditEnvelope['diff'] = undefined;
    if (input.diff && input.diff.before && input.diff.after) {
      sanitizedDiff = {
        before: sanitizeValue(input.diff.before) as Record<string, unknown>,
        after: sanitizeValue(input.diff.after) as Record<string, unknown>,
      };
    }

    const envelopeWithoutHash: Omit<AuditEnvelope, 'hash'> = {
      schemaVersion: 1,
      _id,
      correlationId: input.correlationId,
      timestamp,
      system: input.system || this.defaultSystem,
      category: input.category,
      action: input.action,
      severity: input.severity || 'INFO',
      status: input.status || 'SUCCESS',
      actor: {
        type: input.actor.type,
        userId: input.actor.userId,
        name: input.actor.name,
        email: input.actor.email,
        role: input.actor.role,
        systemName: input.actor.systemName,
      },
      targets: input.targets || [],
      context: input.context || { ip: null },
      changes: input.changes,
      diff: sanitizedDiff,
      details: sanitizedDetails,
      metadata: input.metadata,
    };

    const searchTokens = extractSearchTokens(envelopeWithoutHash);
    const hash = computeEnvelopeHash(envelopeWithoutHash);

    return {
      ...envelopeWithoutHash,
      searchTokens,
      hash,
    };
  }

  /**
   * Envia o log de auditoria para o stream de eventos.
   * Não lança exceções para evitar quebrar a requisição do usuário se a fila falhar.
   */
  public log(input: AuditEnvelopeInput): Promise<boolean> {
    try {
      const envelope = this.buildEnvelope(input);
      return enqueueAuditEvent(envelope);
    } catch (error) {
      console.error('[AuditClient] Erro ao registrar log de auditoria:', error);
      return Promise.resolve(false);
    }
  }
}

export const auditClient = new AuditClient();

