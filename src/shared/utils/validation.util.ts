import { normalizeEmail } from './string.util';

export type FieldValidationResult = { isValid: boolean; message?: string };

export function isRequired(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function isEmail(value: string): boolean {
  const normalized = normalizeEmail(value);
  if (normalized.length > 255) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized);
}

export function isPhone(value: string): boolean {
  const digits = (value ?? '').replace(/\D+/g, '');
  return digits.length === 10 || digits.length === 11;
}

export function isUrl(value: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test((value ?? '').trim());
}

export function isNumber(value: string): boolean {
  return (value ?? '').trim() !== '' && !Number.isNaN(Number(value));
}

export function isDate(value: string): boolean {
  return !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}
