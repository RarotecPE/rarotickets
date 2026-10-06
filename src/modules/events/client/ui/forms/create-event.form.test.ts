import { describe, expect, it } from 'vitest';
import { validateCreateEventForm } from './create-event.form';
import type { CreateEventFormValues } from './create-event.form';

type CreateEventFormCase = { price: string; expectedPriceCents: number };

const createValues = (price: string): CreateEventFormValues => ({
  title: 'Seminário Raro',
  shortDescription: 'Um encontro para compartilhar ideias.',
  description: '',
  eventType: 'PAGO',
  price,
  startAt: '2026-11-10T09:00',
  endAt: '2026-11-10T11:00',
  capacity: '100',
  modality: 'PRESENCIAL',
  location: 'Raro Hub, Campinas',
});

describe('validateCreateEventForm', () => {
  it.each<CreateEventFormCase>([
    { price: '189,90', expectedPriceCents: 18990 },
    { price: '189.90', expectedPriceCents: 18990 },
    { price: '1.234,56', expectedPriceCents: 123456 },
    { price: '1.234', expectedPriceCents: 123400 },
  ])('converte o preço "$price" em centavos', ({ price, expectedPriceCents }) => {
    const result = validateCreateEventForm({ values: createValues(price) });

    expect(result.errors.price).toBeUndefined();
    expect(result.payload?.priceCents).toBe(expectedPriceCents);
  });

  it('aponta um preço inválido sem criar payload', () => {
    const result = validateCreateEventForm({ values: createValues('valor inválido') });

    expect(result.payload).toBeNull();
    expect(result.errors.price).toBeDefined();
  });
});
