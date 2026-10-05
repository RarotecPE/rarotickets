import { Result } from '@core/domain/result';
import { normalizeSpaces } from '@core/domain/text.util';
import { ValueObject } from '@core/domain/value-object.base';

export type CompanyProps = { value: string };

export class Company extends ValueObject<CompanyProps> {
  private constructor(props: CompanyProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): Result<Company> {
    const normalized = normalizeSpaces(value ?? '');
    if (normalized.length < 2) return Result.fail(new Error('Empresa deve ter ao menos 2 caracteres'));
    if (normalized.length > 150) return Result.fail(new Error('Empresa deve ter no máximo 150 caracteres'));
    return Result.ok(new Company({ value: normalized }));
  }

  public static reconstitute(value: string): Company {
    return new Company({ value });
  }
}
