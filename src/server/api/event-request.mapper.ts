import { Result } from "@/@core/domain/result";
import type { EventAddress, EventChargeType, EventModality } from "@/modules/ticketing/domain/events/entities/event.aggregate";
import type { CreateEventInputDto, EventActivityDraft, EventFieldDraft, EventLotDraft } from "@/modules/ticketing/application/use-cases/create-event/create-event.use-case";
import type { FormFieldType } from "@/modules/ticketing/domain/registrations/services/registration-form.domain-service";
import { isJsonRecord, readBoolean, readDate, readInteger, readOptionalText, readStringArray, readText } from "@/server/api/request-data.util";

const FORM_FIELD_TYPES: FormFieldType[] = ["texto", "texto_longo", "numero", "data", "email", "telefone", "cpf", "cnpj", "select", "checkbox", "boolean", "arquivo"];

export class InvalidEventRequestError extends Error {
  readonly code = "INVALID_EVENT_REQUEST";
  constructor(message: string) { super(message); }
}

export function mapCreateEventRequest(value: unknown): Result<CreateEventInputDto, InvalidEventRequestError> {
  if (!isJsonRecord(value)) return Result.fail(new InvalidEventRequestError("O corpo da requisição precisa ser um objeto JSON."));
  const modality = parseModality(value.modality);
  const chargeType = parseChargeType(value.chargeType);
  const startAt = readDate({ value: value.startAt });
  const endAt = readDate({ value: value.endAt });
  const registrationStartAt = readDate({ value: value.registrationStartAt });
  const registrationEndAt = readDate({ value: value.registrationEndAt });
  if (!modality || !chargeType || !startAt || !endAt || !registrationStartAt || !registrationEndAt) {
    return Result.fail(new InvalidEventRequestError("Informe modalidade, cobrança e todas as datas do evento."));
  }
  const address = modality === "presencial" ? mapAddress(value.address) : null;
  const lots = mapLots(value.lots);
  const fields = mapFields(value.fields);
  const activities = mapActivities(value.activities);
  if (!lots || !fields || !activities || (modality === "presencial" && !address)) return Result.fail(new InvalidEventRequestError("Confira endereço, lotes, campos do formulário e programação."));
  return Result.ok({
    title: readText({ value: value.title }),
    description: readText({ value: value.description }),
    summary: readText({ value: value.summary }),
    slug: readText({ value: value.slug }),
    bannerUrl: readOptionalText({ value: value.bannerUrl }),
    modality,
    chargeType,
    startAt,
    endAt,
    registrationStartAt,
    registrationEndAt,
    maxCapacity: readInteger({ value: value.maxCapacity, fallback: 0 }),
    allowsWaitlist: readBoolean({ value: value.allowsWaitlist }),
    onlineUrl: readOptionalText({ value: value.onlineUrl }),
    address,
    responsibleName: readText({ value: value.responsibleName }),
    responsibleEmail: readText({ value: value.responsibleEmail }),
    certificateEnabled: readBoolean({ value: value.certificateEnabled }),
    workloadHours: readInteger({ value: value.workloadHours, fallback: 0 }),
    certificateDescription: readOptionalText({ value: value.certificateDescription }),
    lots,
    fields,
    activities,
  });
}

export function mapUpdateEventProps(value: unknown): Result<UpdateEventRequestData, InvalidEventRequestError> {
  const parsed = mapCreateEventRequest(value);
  if (parsed.isFailure) return Result.fail(parsed.error);
  return Result.ok(parsed.value);
}

export type UpdateEventRequestData = CreateEventInputDto;

function parseModality(value: unknown): EventModality | null {
  return value === "presencial" || value === "online" ? value : null;
}

function parseChargeType(value: unknown): EventChargeType | null {
  return value === "gratuito" || value === "pago" ? value : null;
}

function mapAddress(value: unknown): EventAddress | null {
  if (!isJsonRecord(value)) return null;
  const state = readText({ value: value.state }).toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) return null;
  return {
    street: readText({ value: value.street }),
    number: readText({ value: value.number }),
    complement: readOptionalText({ value: value.complement }),
    neighborhood: readText({ value: value.neighborhood }),
    municipality: readText({ value: value.municipality }),
    state,
  };
}

function mapLots(value: unknown): EventLotDraft[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const lots: EventLotDraft[] = [];
  for (const item of value) {
    if (!isJsonRecord(item)) return null;
    const startAt = readDate({ value: item.startAt });
    const endAt = readDate({ value: item.endAt });
    if (!startAt || !endAt) return null;
    lots.push({
      id: readOptionalText({ value: item.id }) ?? undefined,
      name: readText({ value: item.name }),
      priceCents: readInteger({ value: item.priceCents, fallback: 0 }),
      maxQuantity: readInteger({ value: item.maxQuantity, fallback: 0 }),
      startAt,
      endAt,
      active: readBoolean({ value: item.active, fallback: true }),
      sortOrder: readInteger({ value: item.sortOrder, fallback: lots.length }),
    });
  }
  return lots;
}

function mapFields(value: unknown): EventFieldDraft[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const fields: EventFieldDraft[] = [];
  for (const item of value) {
    if (!isJsonRecord(item) || !FORM_FIELD_TYPES.includes(item.type as FormFieldType)) return null;
    fields.push({
      id: readOptionalText({ value: item.id }) ?? undefined,
      label: readText({ value: item.label }),
      description: readOptionalText({ value: item.description }),
      type: item.type as FormFieldType,
      required: readBoolean({ value: item.required }),
      options: readStringArray({ value: item.options }),
      displayOrder: readInteger({ value: item.displayOrder, fallback: fields.length }),
    });
  }
  return fields;
}

function mapActivities(value: unknown): EventActivityDraft[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const activities: EventActivityDraft[] = [];
  for (const item of value) {
    if (!isJsonRecord(item)) return null;
    const startAt = readDate({ value: item.startAt });
    const endAt = readDate({ value: item.endAt });
    if (!startAt || !endAt) return null;
    activities.push({
      id: readOptionalText({ value: item.id }) ?? undefined,
      title: readText({ value: item.title }),
      description: readText({ value: item.description }),
      speakerName: readText({ value: item.speakerName }),
      speakerBio: readOptionalText({ value: item.speakerBio }),
      room: readOptionalText({ value: item.room }),
      startAt,
      endAt,
    });
  }
  return activities;
}
