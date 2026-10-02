import type { TicketBatch } from '../entities/ticket-batch.entity.ts';
import type { ITicketBatchRepository, TicketBatchId, TicketBatchListParams } from './ticket-batch-repository.interface.ts';

export abstract class TicketBatchRepository implements ITicketBatchRepository {
  abstract findById(id: TicketBatchId): Promise<TicketBatch | null>;
  abstract listForEvent(params: TicketBatchListParams): Promise<TicketBatch[]>;
  abstract save(batch: TicketBatch): Promise<void>;
}
