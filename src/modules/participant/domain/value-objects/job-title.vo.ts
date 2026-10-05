import { Result } from '@core/domain/result';
import { normalizeSpaces } from '@core/domain/text.util';
import { ValueObject } from '@core/domain/value-object.base';

export type JobTitleProps = { value: string };

export class JobTitle extends ValueObject<JobTitleProps> {
  private constructor(props: JobTitleProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): Result<JobTitle> {
    const normalized = normalizeSpaces(value ?? '');
    if (normalized.length < 2) return Result.fail(new Error('Cargo deve ter ao menos 2 caracteres'));
    if (normalized.length > 100) return Result.fail(new Error('Cargo deve ter no máximo 100 caracteres'));
    return Result.ok(new JobTitle({ value: normalized }));
  }

  public static reconstitute(value: string): JobTitle {
    return new JobTitle({ value });
  }
}
