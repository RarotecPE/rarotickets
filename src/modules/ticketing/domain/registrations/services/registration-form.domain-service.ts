import { DomainService } from "@/@core/domain/domain-service.base";
import { Result } from "@/@core/domain/result";
import { Email } from "@/modules/ticketing/domain/participants/value-objects/email.vo";
import { Cpf } from "@/modules/ticketing/domain/participants/value-objects/cpf.vo";
import { Cnpj } from "@/modules/ticketing/domain/participants/value-objects/cnpj.vo";
import { Phone } from "@/modules/ticketing/domain/participants/value-objects/phone.vo";

export type FormFieldType = "texto" | "texto_longo" | "numero" | "data" | "email" | "telefone" | "cpf" | "cnpj" | "select" | "checkbox" | "boolean" | "arquivo";
export type FormFieldDefinition = { id: string; label: string; type: FormFieldType; required: boolean; options: string[] };
export type ValidateRegistrationFormParams = { fields: FormFieldDefinition[]; answers: Record<string, unknown> };
export type FormValidation = { answers: Record<string, unknown>; errors: Record<string, string> };

export class RegistrationFormDomainService extends DomainService<ValidateRegistrationFormParams, FormValidation> {
  execute(params: ValidateRegistrationFormParams): Result<FormValidation> {
    const errors: Record<string, string> = {};
    const normalized: Record<string, unknown> = {};
    for (const field of params.fields) {
      const value = params.answers[field.id];
      const error = RegistrationFormDomainService.validateField(field, value);
      if (error) errors[field.id] = error;
      else normalized[field.id] = value ?? null;
    }
    return Object.keys(errors).length
      ? Result.fail(Object.assign(new Error("Confira os campos destacados."), { code: "FORM_INVALID", details: errors }))
      : Result.ok({ answers: normalized, errors });
  }

  private static validateField(field: FormFieldDefinition, value: unknown): string | null {
    const empty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
    if (field.required && empty) return `${field.label} é obrigatório.`;
    if (empty) return null;
    if (typeof value === "string" && value.length > 2000) return `${field.label} ultrapassa o limite permitido.`;
    if (isTextField(field.type) && typeof value !== "string") return "Informe um valor em formato válido.";
    if (field.type === "email" && Email.create(value as string).isFailure) return "Informe um e-mail válido.";
    if (field.type === "cpf" && Cpf.create(value as string).isFailure) return "Informe um CPF válido.";
    if (field.type === "cnpj" && Cnpj.create(value as string).isFailure) return "Informe um CNPJ válido.";
    if (field.type === "telefone" && Phone.create(value as string).isFailure) return "Informe um telefone válido com DDD.";
    if (field.type === "data" && !isValidDate(value)) return "Informe uma data válida.";
    if (field.type === "numero" && !Number.isFinite(Number(value))) return "Informe um número válido.";
    if (field.type === "select" && !field.options.includes(value as string)) return "Selecione uma opção válida.";
    if (field.type === "checkbox" && !isValidOptionsList({ value, options: field.options })) return "Selecione apenas opções disponíveis.";
    if (field.type === "boolean" && typeof value !== "boolean") return "Selecione sim ou não.";
    if (field.type === "arquivo" && typeof value === "string" && !value.startsWith("file:")) return "O arquivo enviado não é válido.";
    return null;
  }
}

type ValidateOptionListParams = { value: unknown; options: string[] };
function isValidOptionsList(params: ValidateOptionListParams): boolean {
  return Array.isArray(params.value) && params.value.every((item) => typeof item === "string" && params.options.includes(item));
}

function isTextField(type: FormFieldType): boolean {
  return ["texto", "texto_longo", "email", "telefone", "cpf", "cnpj", "select", "arquivo"].includes(type);
}

function isValidDate(value: unknown): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
