/**
 * Utilidades de data do domínio — aritmética simples, sem dependências de
 * runtime. O domínio não pode importar `shared/` (ver ARCHITECTURE §7).
 */
export const MINUTE_IN_MS = 60 * 1000;

export function addMinutesToDate(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE_IN_MS);
}
