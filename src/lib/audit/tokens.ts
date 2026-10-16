import type { AuditEnvelope } from './types';

export function extractSearchTokens(
  envelope: Pick<AuditEnvelope, 'system' | 'category' | 'action' | 'actor' | 'targets' | 'details' | 'diff'>,
): string[] {
  const tokenSet = new Set<string>();

  function addToken(val: unknown) {
    if (typeof val === 'string' && val.trim().length > 1) {
      tokenSet.add(val.trim().toLowerCase());
    } else if (typeof val === 'number') {
      tokenSet.add(String(val));
    }
  }

  addToken(envelope.system);
  addToken(envelope.category);
  addToken(envelope.action);

  if (envelope.actor) {
    addToken(envelope.actor.userId);
    addToken(envelope.actor.name);
    addToken(envelope.actor.email);
    addToken(envelope.actor.role);
    addToken(envelope.actor.systemName);
  }

  if (Array.isArray(envelope.targets)) {
    for (const target of envelope.targets) {
      addToken(target.type);
      addToken(target.id);
      addToken(target.label);
    }
  }

  if (envelope.details && typeof envelope.details === 'object') {
    for (const [k, v] of Object.entries(envelope.details)) {
      addToken(k);
      if (typeof v === 'string' || typeof v === 'number') {
        addToken(v);
      }
    }
  }

  if (envelope.diff) {
    if (envelope.diff.before) {
      for (const [k, v] of Object.entries(envelope.diff.before)) {
        addToken(k);
        if (typeof v === 'string' || typeof v === 'number') addToken(v);
      }
    }
    if (envelope.diff.after) {
      for (const [k, v] of Object.entries(envelope.diff.after)) {
        addToken(k);
        if (typeof v === 'string' || typeof v === 'number') addToken(v);
      }
    }
  }

  return Array.from(tokenSet).slice(0, 100);
}

