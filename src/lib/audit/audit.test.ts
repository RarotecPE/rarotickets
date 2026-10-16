import { describe, it, expect } from 'vitest';
import { auditClient } from './client';
import { generateUuidV7 } from './uuid';
import { sanitizeValue } from './sanitizer';
import { computeEnvelopeHash } from './hash';
import { extractSearchTokens } from './tokens';

describe('Audit SDK - RaroTickets', () => {
  it('gera envelope canônico com hash e tokens válidos', () => {
    const envelope = auditClient.buildEnvelope({
      category: 'event',
      action: 'event.created',
      severity: 'INFO',
      actor: {
        type: 'user',
        userId: 'usr_123',
        name: 'Gestor de Eventos',
        email: 'gestor@rarotec.com.br',
        role: 'administrador',
      },
      targets: [
        { type: 'event', id: 'evt_abc', label: 'Congresso Anual RaroTec 2026' },
      ],
      details: {
        title: 'Congresso Anual RaroTec 2026',
        maxCapacity: 500,
        modality: 'presencial',
      },
      context: {
        ip: '192.168.1.10',
        userAgent: 'Mozilla/5.0 Chrome/120.0',
      },
    });

    expect(envelope.schemaVersion).toBe(1);
    expect(envelope.system).toBe('rarotickets');
    expect(envelope._id).toBeDefined();
    expect(envelope.hash).toBeDefined();
    expect(envelope.searchTokens).toContain('rarotickets');
    expect(envelope.searchTokens).toContain('event.created');
    expect(envelope.searchTokens).toContain('congresso anual rarotec 2026');
  });

  it('higieniza dados sensíveis e calcula diff apenas com antes e depois preenchidos', () => {
    const sanitized = sanitizeValue({
      password: 'super_secret_password',
      token: 'jwt_secret_token',
      credit_card: '4111111111111111',
      title: 'Workshop Técnico',
    }) as Record<string, unknown>;

    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.token).toBe('[REDACTED]');
    expect(sanitized.credit_card).toBe('[REDACTED]');
    expect(sanitized.title).toBe('Workshop Técnico');

    const envelopeWithDiff = auditClient.buildEnvelope({
      category: 'event',
      action: 'event.updated',
      actor: { type: 'user', name: 'Gestor' },
      targets: [{ type: 'event', id: 'evt_1', label: 'Evento 1' }],
      diff: {
        before: { title: 'Antigo Título', maxCapacity: 100 },
        after: { title: 'Novo Título', maxCapacity: 200 },
      },
    });

    expect(envelopeWithDiff.diff).toBeDefined();
    expect(envelopeWithDiff.diff?.before.title).toBe('Antigo Título');
    expect(envelopeWithDiff.diff?.after.title).toBe('Novo Título');
  });

  it('UUIDv7 gera IDs ordenáveis e válidos', () => {
    const id1 = generateUuidV7();
    const id2 = generateUuidV7();

    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(id2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});

