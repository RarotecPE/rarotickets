/**
 * Normalizações de texto usadas pelo domínio. Ficam no núcleo (e não em
 * `shared/`) porque o domínio não pode depender da camada shared.
 */
export function normalizeSpaces(value: string): string {
  return (value ?? '').trim().replace(/\s+/g, ' ');
}

export function normalizeEmail(value: string): string {
  return (value ?? '').trim().toLowerCase();
}

export function normalizeCode(value: string): string {
  return (value ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

export function toSlug(value: string): string {
  return normalizeSpaces(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
