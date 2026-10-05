import { DomainService } from '../domain-service.base';
import { Result } from '../result';

export type SeatAllocationParams = {
  capacity: number;
  occupiedSeats: number;
  reservedSeats: number;
  waitlistEnabled: boolean;
};

export type SeatAllocationDecision = {
  outcome: 'OCUPAR' | 'RESERVAR' | 'LISTA_ESPERA';
  availableSeats: number;
};

/**
 * Decide onde uma nova inscrição entra: vaga imediata, reserva temporária ou
 * lista de espera (§3 e §26). Nunca permite ultrapassar a capacidade.
 */
export class SeatAllocationService extends DomainService<SeatAllocationParams, SeatAllocationDecision> {
  execute(params: SeatAllocationParams): Result<SeatAllocationDecision> {
    const availableSeats = Math.max(params.capacity - params.occupiedSeats - params.reservedSeats, 0);

    if (availableSeats > 0) {
      return Result.ok({ outcome: 'OCUPAR', availableSeats });
    }
    if (params.waitlistEnabled) {
      return Result.ok({ outcome: 'LISTA_ESPERA', availableSeats });
    }
    return Result.fail(new Error('A capacidade máxima do evento foi atingida e não há lista de espera habilitada'));
  }

  /** Reserva temporária usada no fluxo de eventos pagos (§4). */
  reserve(params: SeatAllocationParams): Result<SeatAllocationDecision> {
    const decision = this.execute(params);
    if (decision.isFailure) return decision;
    if (decision.value.outcome === 'OCUPAR') {
      return Result.ok({ ...decision.value, outcome: 'RESERVAR' });
    }
    return decision;
  }
}
