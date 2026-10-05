import { DomainService } from '../domain-service.base';
import { Result } from '../result';

export type LoteCandidate = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  maxQuantity: number;
  soldQuantity: number;
  priceCents: number;
  isActive: boolean;
  orderIndex: number;
};

export type SelectCurrentLoteParams = { lotes: LoteCandidate[]; at: Date };

/**
 * Identifica o lote vigente considerando período, quantidade disponível e
 * situação; quando um lote termina, o próximo elegível assume (§5).
 */
export class LoteSelectionService extends DomainService<SelectCurrentLoteParams, LoteCandidate> {
  execute(params: SelectCurrentLoteParams): Result<LoteCandidate> {
    const elegible = params.lotes
      .filter((lote) => this.isElegible(lote, params.at))
      .sort((first, second) => {
        const difference = first.startDate.getTime() - second.startDate.getTime();
        return difference !== 0 ? difference : first.orderIndex - second.orderIndex;
      });

    const current = elegible[0];
    if (!current) {
      const hasFutureLote = params.lotes.some((lote) => lote.startDate.getTime() > params.at.getTime());
      return Result.fail(
        new Error(
          hasFutureLote
            ? 'Nenhum lote está vigente — o próximo lote ainda não iniciou'
            : 'Nenhum lote está vigente para este evento no momento',
        ),
      );
    }

    return Result.ok(current);
  }

  public isElegible(lote: LoteCandidate, at: Date): boolean {
    if (!lote.isActive) return false;
    if (lote.soldQuantity >= lote.maxQuantity) return false;
    const time = at.getTime();
    return time >= lote.startDate.getTime() && time <= lote.endDate.getTime();
  }
}
