import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type WorkloadHoursProps = { value: number };

export class WorkloadHours extends ValueObject<WorkloadHoursProps> {
  private constructor(props: WorkloadHoursProps) {
    super(props);
  }

  get value(): number {
    return this.props.value;
  }

  public static create(value: number): Result<WorkloadHours> {
    if (Number.isNaN(value)) return Result.fail(new Error('Carga horária inválida'));
    if (value < 0) return Result.fail(new Error('Carga horária não pode ser negativa'));
    if (value > 2000) return Result.fail(new Error('Carga horária acima do limite permitido'));
    return Result.ok(new WorkloadHours({ value: Math.round(value * 10) / 10 }));
  }

  public static reconstitute(value: number): WorkloadHours {
    return new WorkloadHours({ value });
  }
}
