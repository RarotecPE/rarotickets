import { DomainService } from '@core/domain/domain-service.base';
import { Result } from '@core/domain/result';
import { LoteSelectionService } from '@core/domain/services/lote-selection.service';
import type { EventLote } from '../entities/event-lote.entity';
import { LoteNotAvailableError } from '../errors/lote-not-available.error';

export type SelectCurrentLoteParams = { lotes: EventLote[]; at: Date };
export type SelectedLote = { lote: EventLote; priceCents: number };

/**
 * Identifica automaticamente o lote vigente do evento (§5).
 * A regra de seleção vive no núcleo e é compartilhada com as inscrições.
 */
export class LoteSelectorService extends DomainService<SelectCurrentLoteParams, SelectedLote> {
  private readonly selection = new LoteSelectionService();

  execute(params: SelectCurrentLoteParams): Result<SelectedLote> {
    const candidates = params.lotes.map((lote) => ({
      id: lote.id.toString(),
      name: lote.name,
      startDate: lote.startDate,
      endDate: lote.endDate,
      maxQuantity: lote.maxQuantity,
      soldQuantity: lote.soldQuantity,
      priceCents: lote.price.cents,
      isActive: lote.isActive,
      orderIndex: lote.orderIndex,
    }));

    const result = this.selection.execute({ lotes: candidates, at: params.at });
    if (result.isFailure) {
      return result.error.message.includes('não iniciou')
        ? Result.fail(result.error)
        : Result.fail(new LoteNotAvailableError());
    }

    const lote = params.lotes.find((item) => item.id.toString() === result.value.id);
    if (!lote) return Result.fail(new LoteNotAvailableError());

    return Result.ok({ lote, priceCents: lote.price.cents });
  }
}
