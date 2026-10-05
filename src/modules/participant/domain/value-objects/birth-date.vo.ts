import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type BirthDateProps = { value: Date };

const MIN_AGE = 0;
const MAX_AGE = 120;

export class BirthDate extends ValueObject<BirthDateProps> {
  private constructor(props: BirthDateProps) {
    super(props);
  }

  get value(): Date {
    return this.props.value;
  }

  public static create(value: Date | string): Result<BirthDate> {
    const date = value instanceof Date ? value : parseDate(value);
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return Result.fail(new Error('Data de nascimento inválida'));
    }
    const now = new Date();
    if (date.getTime() > now.getTime()) return Result.fail(new Error('Data de nascimento não pode ser futura'));

    if (ageInYears(date, now) > MAX_AGE) return Result.fail(new Error('Data de nascimento inválida'));
    if (ageInYears(date, now) < MIN_AGE) return Result.fail(new Error('Data de nascimento inválida'));
    return Result.ok(new BirthDate({ value: date }));
  }

  public static reconstitute(value: Date | string): BirthDate {
    return new BirthDate({ value: value instanceof Date ? value : parseDate(value) });
  }

  public ageAt(reference: Date): number {
    return ageInYears(this.props.value, reference);
  }
}

function parseDate(value: string): Date {
  const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(value ?? '');
  return new Date(isoMatch ? `${value}T00:00:00.000Z` : value);
}

function ageInYears(birth: Date, reference: Date): number {
  let age = reference.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = reference.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}
