import { EventCapacity } from '../../../domain/value-objects/event-capacity.vo';
import { EventPeriod } from '../../../domain/value-objects/event-period.vo';
import { EventPrice } from '../../../domain/value-objects/event-price.vo';
import { EventTitle } from '../../../domain/value-objects/event-title.vo';
import type { CreateEventPayload } from '../../types/event.types';

export type CreateEventFormValues = {
  title: string;
  shortDescription: string;
  description: string;
  eventType: 'GRATUITO' | 'PAGO';
  price: string;
  startAt: string;
  endAt: string;
  capacity: string;
  modality: 'PRESENCIAL' | 'ONLINE';
  location: string;
};

export type CreateEventFormErrors = Partial<Record<keyof CreateEventFormValues, string>>;
export type ValidateCreateEventFormParams = { values: CreateEventFormValues };
export type ValidateCreateEventFormResult = { payload: CreateEventPayload | null; errors: CreateEventFormErrors };
type ParseEventPriceCentsParams = { priceInput: string };
type DateTimeLocalInput = string;
type EventLocationInput = string;

export function validateCreateEventForm(params: ValidateCreateEventFormParams): ValidateCreateEventFormResult {
  const { values } = params;
  const errors: CreateEventFormErrors = {};
  const titleResult = EventTitle.create(values.title);
  if (titleResult.isFailure) errors.title = titleResult.error.message;

  const periodResult = EventPeriod.create({
    startAt: toIsoDateTime(values.startAt),
    endAt: toIsoDateTime(values.endAt),
  });
  if (periodResult.isFailure) errors.endAt = periodResult.error.message;

  const capacity = values.capacity.trim() ? Number(values.capacity) : null;
  const capacityResult = EventCapacity.create(capacity);
  if (capacityResult.isFailure) errors.capacity = capacityResult.error.message;

  const priceCents = values.eventType === 'PAGO' ? parseEventPriceCents({ priceInput: values.price }) : 0;
  const priceResult = EventPrice.create({ eventType: values.eventType, priceCents });
  if (priceResult.isFailure) errors.price = priceResult.error.message;

  if (!values.shortDescription.trim()) errors.shortDescription = 'Adicione um resumo para identificar o evento.';
  if (values.modality === 'PRESENCIAL' && !values.location.trim()) errors.location = 'Informe o local do evento.';
  if (values.modality === 'ONLINE' && !isHttpsUrl(values.location)) errors.location = 'Informe um link válido começando com https://.';
  if (Object.keys(errors).length > 0 || !titleResult.isSuccess || !periodResult.isSuccess || !capacityResult.isSuccess || !priceResult.isSuccess) {
    return { payload: null, errors };
  }
  return {
    payload: {
      title: titleResult.value.value,
      shortDescription: values.shortDescription.trim(),
      description: values.description.trim(),
      eventType: values.eventType,
      priceCents: priceResult.value.priceCents,
      startAt: periodResult.value.startAt,
      endAt: periodResult.value.endAt,
      capacity: capacityResult.value.value,
      modality: values.modality,
      location: values.location.trim(),
    },
    errors,
  };
}

function parseEventPriceCents(params: ParseEventPriceCentsParams): number {
  const input = params.priceInput.trim();
  const normalizedInput = input.includes(',')
    ? input.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(?:\.\d{3})+$/.test(input) ? input.replace(/\./g, '') : input;
  const priceInReais = Number(normalizedInput);
  return Number.isFinite(priceInReais) ? Math.round(priceInReais * 100) : Number.NaN;
}

function toIsoDateTime(value: DateTimeLocalInput): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function isHttpsUrl(value: EventLocationInput): boolean {
  return /^https:\/\/\S+$/i.test(value.trim());
}
