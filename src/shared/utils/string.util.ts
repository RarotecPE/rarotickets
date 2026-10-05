export { normalizeSpaces, normalizeEmail, normalizeCode, toSlug } from '@core/domain/text.util';

export function maskEmail(value: string): string {
  const [localPart = '', domain = ''] = (value ?? '').trim().toLowerCase().split('@');
  if (!domain) return value;
  const visible = localPart.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(localPart.length - 2, 1))}@${domain}`;
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(maxLength - 1, 0))}…`;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
