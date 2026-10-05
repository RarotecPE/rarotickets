import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type SeatStatusValue = 'RESERVADA' | 'OCUPADA' | 'LIBERADA' | 'EXPIRADA';
export type SeatStatusProps = { value: SeatStatusValue };

export const SEAT_STATUSES: readonly SeatStatusValue[] = ['RESERVADA', 'OCUPADA', 'LIBERADA', 'EXPIRADA'];

/** Situação da vaga: reserva temporária, ocupada, liberada ou expirada (§4). */
export class SeatStatus extends ValueObject<SeatStatusProps> {
  private constructor(props: SeatStatusProps) {
    super(props);
  }

  get value(): SeatStatusValue {
    return this.props.value;
  }

  public static create(value: string): Result<SeatStatus> {
    const normalized = (value ?? '').toUpperCase() as SeatStatusValue;
    if (!SEAT_STATUSES.includes(normalized)) return Result.fail(new Error('Situação de vaga inválida'));
    return Result.ok(new SeatStatus({ value: normalized }));
  }

  public static reconstitute(value: SeatStatusValue): SeatStatus {
    return new SeatStatus({ value });
  }

  public isReserved(): boolean {
    return this.props.value === 'RESERVADA';
  }

  public isOccupied(): boolean {
    return this.props.value === 'OCUPADA';
  }

  /** Reserva ou vaga ocupada impedem que outra inscrição use o mesmo lugar. */
  public blocksSeat(): boolean {
    return this.props.value === 'RESERVADA' || this.props.value === 'OCUPADA';
  }
}
