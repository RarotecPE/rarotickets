import { MoneyVO } from '@core/domain/value-objects/money.vo';

export function formatCents(cents: number): string {
  return MoneyVO.reconstitute({ cents }).format();
}

export function parseAmountToCents(value: string): number | null {
  const cleaned = (value ?? '').replace(/\s/g, '').replace(/^R\$/, '');
  if (!cleaned) return null;
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed * 100);
}
