import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type PercentageProps = { value: number };

export class Percentage extends ValueObject<PercentageProps> {
  private constructor(props: PercentageProps) {
    super(props);
  }

  get value(): number {
    return this.props.value;
  }

  public static create(value: number): Result<Percentage> {
    if (Number.isNaN(value)) return Result.fail(new Error('Percentual inválido'));
    if (value < 0 || value > 100) {
      return Result.fail(new Error('Percentual deve estar entre 0 e 100'));
    }
    return Result.ok(new Percentage({ value: Math.round(value * 100) / 100 }));
  }

  public static reconstitute(value: number): Percentage {
    return new Percentage({ value });
  }
}
