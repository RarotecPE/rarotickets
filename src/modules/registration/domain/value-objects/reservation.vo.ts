import { addMinutesToDate } from '@core/domain/date.util';
import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type ReservationProps = { expiresAt: Date | null };
export type CreateReservationParams = { from: Date; minutes: number };

/**
 * Reserva temporária de vaga durante o pagamento (§4). Uma inscrição pendente
 * não pode bloquear a vaga indefinidamente.
 */
export class Reservation extends ValueObject<ReservationProps> {
  private constructor(props: ReservationProps) {
    super(props);
  }

  get expiresAt(): Date | null {
    return this.props.expiresAt;
  }

  public static create(params: CreateReservationParams): Result<Reservation> {
    if (!Number.isInteger(params.minutes) || params.minutes <= 0) {
      return Result.fail(new Error('Tempo de reserva de vaga inválido'));
    }
    return Result.ok(new Reservation({ expiresAt: addMinutesToDate(params.from, params.minutes) }));
  }

  public static none(): Reservation {
    return new Reservation({ expiresAt: null });
  }

  public static reconstitute(expiresAt: Date | null): Reservation {
    return new Reservation({ expiresAt });
  }

  public isExpired(reference: Date): boolean {
    if (!this.props.expiresAt) return false;
    return this.props.expiresAt.getTime() <= reference.getTime();
  }

  public isActive(reference: Date): boolean {
    return this.props.expiresAt !== null && !this.isExpired(reference);
  }

  public extendTo(date: Date): Result<void> {
    if (this.props.expiresAt && date.getTime() < this.props.expiresAt.getTime()) {
      return Result.fail(new Error('Nova expiração deve ser posterior à atual'));
    }
    (this.props as { expiresAt: Date | null }).expiresAt = date;
    return Result.ok();
  }
}
