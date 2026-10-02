import { DomainService } from '../../../../@core/domain/domain-service.base.ts';
import { Result } from '../../../../@core/domain/result.ts';
import { NotFoundError } from '../../../../@core/domain/errors/domain-errors.ts';
import type { TicketBatch } from '../entities/ticket-batch.entity.ts';
import type { BatchAvailabilityParams } from '../entities/ticket-batch.entity.ts';

export type BatchUsage = { batchId: string; committedQuantity: number };
export type SelectCurrentTicketBatchParams = {
  batches: TicketBatch[];
  usage: BatchUsage[];
  now: Date;
};

export class SelectCurrentTicketBatchService extends DomainService<SelectCurrentTicketBatchParams, TicketBatch, NotFoundError> {
  public execute(params: SelectCurrentTicketBatchParams): Result<TicketBatch, NotFoundError> {
    const candidates = params.batches
      .map((batch) => ({ batch, usage: this.usageFor({ batchId: batch.id.toString(), usage: params.usage }) }))
      .filter(({ batch, usage }) => batch.isEligible({ now: params.now, committedQuantity: usage } satisfies BatchAvailabilityParams))
      .sort((left, right) => left.batch.startsAt.getTime() - right.batch.startsAt.getTime());
    const current = candidates[0]?.batch;
    if (!current) {
      return Result.fail(new NotFoundError({ code: 'NO_ACTIVE_TICKET_BATCH', message: 'Não existe lote ativo e disponível para este evento.' }));
    }
    return Result.ok(current);
  }

  private usageFor(params: { batchId: string; usage: BatchUsage[] }): number {
    return params.usage.find((item) => item.batchId === params.batchId)?.committedQuantity ?? 0;
  }
}
