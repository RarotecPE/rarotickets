import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type EventPeriodProps = {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

/** Período do evento com datas e horários de início e término (UTC). */
export class EventPeriod extends ValueObject<EventPeriodProps> {
  private constructor(props: EventPeriodProps) {
    super(props);
  }

  get startDate(): string { return this.props.startDate; }
  get endDate(): string { return this.props.endDate; }
  get startTime(): string { return this.props.startTime; }
  get endTime(): string { return this.props.endTime; }

  public get startAt(): Date {
    return new Date(`${this.props.startDate}T${this.props.startTime}:00.000Z`);
  }

  public get endAt(): Date {
    return new Date(`${this.props.endDate}T${this.props.endTime}:00.000Z`);
  }

  public get durationInHours(): number {
    return Math.round(((this.endAt.getTime() - this.startAt.getTime()) / 3_600_000) * 10) / 10;
  }

  public static create(params: EventPeriodProps): Result<EventPeriod> {
    if (!DATE_PATTERN.test(params.startDate ?? '')) return Result.fail(new Error('Data de início inválida'));
    if (!DATE_PATTERN.test(params.endDate ?? '')) return Result.fail(new Error('Data de término inválida'));
    if (!TIME_PATTERN.test(params.startTime ?? '')) return Result.fail(new Error('Horário de início inválido'));
    if (!TIME_PATTERN.test(params.endTime ?? '')) return Result.fail(new Error('Horário de término inválido'));

    const period = new EventPeriod({
      startDate: params.startDate,
      endDate: params.endDate,
      startTime: params.startTime,
      endTime: params.endTime,
    });

    if (Number.isNaN(period.startAt.getTime()) || Number.isNaN(period.endAt.getTime())) {
      return Result.fail(new Error('Período do evento inválido'));
    }
    if (period.endAt.getTime() <= period.startAt.getTime()) {
      return Result.fail(new Error('Término do evento deve ser posterior ao início'));
    }
    if (period.durationInHours > 24 * 90) {
      return Result.fail(new Error('Duração do evento não pode exceder 90 dias'));
    }
    return Result.ok(period);
  }

  public static reconstitute(params: EventPeriodProps): EventPeriod {
    return new EventPeriod(params);
  }

  public hasStarted(reference: Date): boolean {
    return this.startAt.getTime() <= reference.getTime();
  }

  public hasEnded(reference: Date): boolean {
    return this.endAt.getTime() < reference.getTime();
  }
}
