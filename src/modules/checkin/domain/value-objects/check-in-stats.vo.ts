import { ValueObject } from '@core/domain/value-object.base';

export type CheckInStatsProps = {
  expected: number;
  checkedIn: number;
  cancelled: number;
  waitlisted: number;
};

/**
 * Números do credenciamento de um evento (§29): quantos eram esperados,
 * quantos compareceram e a taxa de presença usada nos relatórios (§41).
 */
export class CheckInStats extends ValueObject<CheckInStatsProps> {
  private constructor(props: CheckInStatsProps) {
    super(props);
  }

  public static create(props: CheckInStatsProps): CheckInStats {
    return new CheckInStats({
      expected: Math.max(props.expected, 0),
      checkedIn: Math.max(props.checkedIn, 0),
      cancelled: Math.max(props.cancelled, 0),
      waitlisted: Math.max(props.waitlisted, 0),
    });
  }

  public get expected(): number {
    return this.props.expected;
  }

  public get checkedIn(): number {
    return this.props.checkedIn;
  }

  public get cancelled(): number {
    return this.props.cancelled;
  }

  public get waitlisted(): number {
    return this.props.waitlisted;
  }

  public get absent(): number {
    return Math.max(this.props.expected - this.props.checkedIn, 0);
  }

  /** Taxa de presença em pontos percentuais (0–100), arredondada em 1 casa. */
  public get attendanceRate(): number {
    if (this.props.expected === 0) return 0;
    return Math.round((this.props.checkedIn / this.props.expected) * 1000) / 10;
  }

  public get attendanceRateLabel(): string {
    return `${this.attendanceRate.toFixed(1).replace('.', ',')}%`;
  }

  public isFinished(): boolean {
    return this.props.expected > 0 && this.props.checkedIn === this.props.expected;
  }

  public toJSON(): CheckInStatsProps {
    return { ...this.props };
  }

  public describe(): string {
    return `${this.checkedIn} de ${this.expected} presentes (${this.attendanceRateLabel})`;
  }
}
