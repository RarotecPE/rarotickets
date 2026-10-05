import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type RegistrationWindowProps = { start: Date; end: Date };

/** Período de inscrições do evento (§2). */
export class RegistrationWindow extends ValueObject<RegistrationWindowProps> {
  private constructor(props: RegistrationWindowProps) {
    super(props);
  }

  get start(): Date { return this.props.start; }
  get end(): Date { return this.props.end; }

  public static create(params: { start: Date | string; end: Date | string }): Result<RegistrationWindow> {
    const start = params.start instanceof Date ? params.start : new Date(params.start);
    const end = params.end instanceof Date ? params.end : new Date(params.end);

    if (Number.isNaN(start.getTime())) return Result.fail(new Error('Início das inscrições inválido'));
    if (Number.isNaN(end.getTime())) return Result.fail(new Error('Fim das inscrições inválido'));
    if (end.getTime() <= start.getTime()) {
      return Result.fail(new Error('Fim das inscrições deve ser posterior ao início'));
    }
    return Result.ok(new RegistrationWindow({ start, end }));
  }

  public static reconstitute(params: RegistrationWindowProps): RegistrationWindow {
    return new RegistrationWindow(params);
  }

  public isOpenAt(reference: Date): boolean {
    const time = reference.getTime();
    return time >= this.props.start.getTime() && time <= this.props.end.getTime();
  }

  public hasNotStarted(reference: Date): boolean {
    return reference.getTime() < this.props.start.getTime();
  }

  public hasClosed(reference: Date): boolean {
    return reference.getTime() > this.props.end.getTime();
  }
}
