import { describe, expect, it } from 'vitest';
import { validateInternalRedirect } from './safe-redirect.util';

describe('validateInternalRedirect', () => {
  it('preserva um destino interno válido', () => {
    const destination = validateInternalRedirect({
      candidate: '/events?filter=open#list',
      appBaseUrl: 'https://tickets.example.com',
    });

    expect(destination).toBe('/events?filter=open#list');
  });

  it.each(['https://attacker.example', '//attacker.example', '/api/auth/logout', '/\\\\attacker.example'])
  ('substitui destinos externos ou inadequados pelo destino padrão: %s', (candidate) => {
    const destination = validateInternalRedirect({
      candidate,
      appBaseUrl: 'https://tickets.example.com',
    });

    expect(destination).toBe('/dashboard');
  });
});
