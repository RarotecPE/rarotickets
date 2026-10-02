import type { TicketBatch } from '../entities/ticket-batch.entity.ts';

export type TicketBatchId = string;
export type TicketBatchListParams = { eventId: string; includeInactive: boolean };

export interface ITicketBatchRepository {
  findById(id: TicketBatchId): Promise<TicketBatch | null>;
  listForEvent(params: TicketBatchListParams): Promise<TicketBatch[]>;
  save(batch: TicketBatch): Promise<void>;
}
