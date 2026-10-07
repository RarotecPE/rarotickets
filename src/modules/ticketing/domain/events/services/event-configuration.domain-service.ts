import { DomainService } from "@/@core/domain/domain-service.base";
import { Result } from "@/@core/domain/result";
import type { FormFieldType } from "@/modules/ticketing/domain/registrations/services/registration-form.domain-service";

export type EventConfigurationLot = {
  name: string;
  priceCents: number;
  maxQuantity: number;
  startAt: Date;
  endAt: Date;
};
export type EventConfigurationField = {
  label: string;
  description: string | null;
  type: FormFieldType;
  options: string[];
  displayOrder: number;
};
export type EventConfigurationActivity = {
  title: string;
  speakerName: string;
  startAt: Date;
  endAt: Date;
};
export type ValidateEventConfigurationParams = {
  chargeType: "gratuito" | "pago";
  registrationStartAt: Date;
  registrationEndAt: Date;
  eventStartAt: Date;
  eventEndAt: Date;
  lots: EventConfigurationLot[];
  fields: EventConfigurationField[];
  activities: EventConfigurationActivity[];
};

export class EventConfigurationDomainService extends DomainService<
  ValidateEventConfigurationParams,
  void
> {
  execute(params: ValidateEventConfigurationParams): Result<void> {
    if (
      ![
        params.registrationStartAt,
        params.registrationEndAt,
        params.eventStartAt,
        params.eventEndAt,
      ].every(isValidDate)
    ) {
      return Result.fail(
        new Error("As datas do evento e das inscrições precisam ser válidas."),
      );
    }
    if (
      params.eventStartAt >= params.eventEndAt ||
      params.registrationStartAt >= params.registrationEndAt ||
      params.registrationEndAt > params.eventEndAt
    ) {
      return Result.fail(
        new Error("O período do evento ou das inscrições é inválido."),
      );
    }
    const lotError = validateLots({
      lots: params.lots,
      chargeType: params.chargeType,
      startAt: params.registrationStartAt,
      endAt: params.registrationEndAt,
    });
    if (lotError) return Result.fail(new Error(lotError));
    const fieldError = validateFields({ fields: params.fields });
    if (fieldError) return Result.fail(new Error(fieldError));
    const activityError = validateActivities({
      activities: params.activities,
      startAt: params.eventStartAt,
      endAt: params.eventEndAt,
    });
    if (activityError) return Result.fail(new Error(activityError));
    return Result.ok(undefined);
  }
}

type ValidateLotsParams = {
  lots: EventConfigurationLot[];
  chargeType: "gratuito" | "pago";
  startAt: Date;
  endAt: Date;
};
type ValidateFieldsParams = { fields: EventConfigurationField[] };
type ValidateActivitiesParams = {
  activities: EventConfigurationActivity[];
  startAt: Date;
  endAt: Date;
};

function validateLots(params: ValidateLotsParams): string | null {
  if (params.chargeType === "pago" && params.lots.length === 0)
    return "Inclua ao menos um lote para um evento pago.";
  if (params.chargeType === "gratuito" && params.lots.length > 0)
    return "Eventos gratuitos não podem ter lotes de ingressos pagos.";
  for (const lot of params.lots) {
    if (!lot.name.trim() || lot.name.length > 100)
      return "Cada lote precisa de um nome com até 100 caracteres.";
    if (
      !Number.isSafeInteger(lot.priceCents) ||
      lot.priceCents < 0 ||
      (params.chargeType === "pago" && lot.priceCents === 0)
    )
      return "O preço dos lotes pagos precisa ser maior que zero.";
    if (!Number.isInteger(lot.maxQuantity) || lot.maxQuantity <= 0)
      return "A quantidade máxima de cada lote precisa ser maior que zero.";
    if (
      !isValidDate(lot.startAt) ||
      !isValidDate(lot.endAt) ||
      lot.startAt < params.startAt ||
      lot.endAt > params.endAt ||
      lot.startAt >= lot.endAt
    )
      return "O período de cada lote deve estar dentro do período de inscrições.";
  }
  return null;
}

function validateFields(params: ValidateFieldsParams): string | null {
  for (const field of params.fields) {
    if (!field.label.trim() || field.label.length > 120)
      return "Cada campo adicional precisa de um rótulo com até 120 caracteres.";
    if (
      (field.type === "select" || field.type === "checkbox") &&
      (!field.options.length ||
        field.options.some((option) => !option.trim()) ||
        new Set(field.options).size !== field.options.length)
    )
      return `Informe opções válidas e sem repetição para “${field.label}”.`;
    if (field.description && field.description.length > 300)
      return `A descrição de “${field.label}” ultrapassa 300 caracteres.`;
    if (!Number.isInteger(field.displayOrder) || field.displayOrder < 0)
      return "A ordem dos campos do formulário é inválida.";
  }
  return null;
}

function validateActivities(params: ValidateActivitiesParams): string | null {
  for (const activity of params.activities) {
    if (!activity.title.trim() || activity.title.length > 160)
      return "Cada atividade precisa de um título com até 160 caracteres.";
    if (!activity.speakerName.trim() || activity.speakerName.length > 140)
      return "Informe o nome do palestrante de cada atividade.";
    if (
      !isValidDate(activity.startAt) ||
      !isValidDate(activity.endAt) ||
      activity.startAt < params.startAt ||
      activity.endAt > params.endAt ||
      activity.startAt >= activity.endAt
    )
      return "O horário de cada atividade deve estar dentro do período do evento.";
  }
  return null;
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}
