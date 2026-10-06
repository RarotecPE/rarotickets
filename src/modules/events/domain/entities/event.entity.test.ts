import { describe, expect, it } from 'vitest';
import { Event } from './event.entity';

describe('Event', () => {
  it('cria um evento online gratuito em rascunho sem limitar vagas', () => {
    const eventResult = Event.create({
      title: 'Encontro de comunidades',
      shortDescription: 'Uma conversa aberta para a comunidade.',
      description: 'Descrição do encontro.',
      eventType: 'GRATUITO',
      priceCents: 0,
      startAt: '2026-11-10T17:00:00.000Z',
      endAt: '2026-11-10T18:30:00.000Z',
      capacity: null,
      modality: 'ONLINE',
      location: 'https://meet.example.com/encontro',
      createdById: 'user-1',
    });

    expect(eventResult.isSuccess).toBe(true);
    expect(eventResult.value.status).toBe('RASCUNHO');
    expect(eventResult.value.capacity).toBeNull();
  });

  it('rejeita um período em que o evento termina antes de começar', () => {
    const eventResult = Event.create({
      title: 'Encontro de comunidades',
      shortDescription: 'Uma conversa aberta para a comunidade.',
      description: '',
      eventType: 'GRATUITO',
      priceCents: 0,
      startAt: '2026-11-10T18:30:00.000Z',
      endAt: '2026-11-10T17:00:00.000Z',
      capacity: 100,
      modality: 'PRESENCIAL',
      location: 'Campinas, SP',
      createdById: 'user-1',
    });

    expect(eventResult.isFailure).toBe(true);
    expect(eventResult.error).toMatchObject({ code: 'INVALID_EVENT_PERIOD' });
  });

  it('não permite reativar um evento cancelado', () => {
    const eventResult = Event.create({
      title: 'Encontro de comunidades',
      shortDescription: 'Uma conversa aberta para a comunidade.',
      description: '',
      eventType: 'GRATUITO',
      priceCents: 0,
      startAt: '2026-11-10T17:00:00.000Z',
      endAt: '2026-11-10T18:30:00.000Z',
      capacity: 100,
      status: 'CANCELADO',
      modality: 'PRESENCIAL',
      location: 'Campinas, SP',
      createdById: 'user-1',
    });
    const changeResult = eventResult.value.changeStatus({ status: 'INSCRICOES_ABERTAS' });

    expect(changeResult.isFailure).toBe(true);
    expect(changeResult.error).toMatchObject({ code: 'INVALID_EVENT_STATUS' });
  });
});
