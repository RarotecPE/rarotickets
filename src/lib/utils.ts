export type ClassValue = string | null | undefined | false;

export function cn(...parts: ClassValue[]): string {
  return parts.flatMap((part) => typeof part === "string" && part ? [part] : []).join(" ");
}

export type FormatCurrencyParams = { cents: number; currency?: string; locale?: string };
export function formatCurrency(params: FormatCurrencyParams): string {
  return new Intl.NumberFormat(params.locale ?? "pt-BR", { style: "currency", currency: params.currency ?? "BRL" }).format(params.cents / 100);
}

export type FormatDateParams = { value: Date | string | null; withTime?: boolean; timeZone?: string };
export function formatDate(params: FormatDateParams): string {
  if (!params.value) return "—";
  const date = params.value instanceof Date ? params.value : new Date(params.value);
  if (Number.isNaN(date.getTime())) return "—";
  const options: Intl.DateTimeFormatOptions = params.withTime ? { dateStyle: "short", timeStyle: "short", timeZone: params.timeZone ?? "America/Sao_Paulo" } : { dateStyle: "medium", timeZone: params.timeZone ?? "America/Sao_Paulo" };
  return new Intl.DateTimeFormat("pt-BR", options).format(date);
}

export function formatDateInput(value: Date | string | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function formatShortNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
}
