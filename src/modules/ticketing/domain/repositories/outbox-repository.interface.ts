export type EnqueueMessageParams = { channel: "email" | "whatsapp"; recipient: string; subject: string; template: string; payload: Record<string, unknown> };
export type OutboxMessage = EnqueueMessageParams & { id: string; attempts: number; createdAt: Date };
export type UpdateOutboxParams = { id: string; status: "sent" | "pending" | "failed"; attempts: number; lastError?: string | null };

export interface IOutboxRepository {
  enqueue(params: EnqueueMessageParams): Promise<void>;
  claimPending(params: { limit: number }): Promise<OutboxMessage[]>;
  update(params: UpdateOutboxParams): Promise<void>;
}

export abstract class OutboxRepository implements IOutboxRepository {
  abstract enqueue(params: EnqueueMessageParams): Promise<void>;
  abstract claimPending(params: { limit: number }): Promise<OutboxMessage[]>;
  abstract update(params: UpdateOutboxParams): Promise<void>;
}
