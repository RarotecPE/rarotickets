import "server-only";
import { asc, eq } from "drizzle-orm";
import { OutboxRepository } from "@/modules/ticketing/domain/repositories/outbox-repository.interface";
import type { EnqueueMessageParams, OutboxMessage, UpdateOutboxParams } from "@/modules/ticketing/domain/repositories/outbox-repository.interface";
import { outboxMessages } from "@/server/infrastructure/persistence/schema";
import type { Database } from "@/server/infrastructure/persistence/database";

export type DrizzleOutboxRepositoryDependencies = { database: Database };

export class DrizzleOutboxRepository extends OutboxRepository {
  private readonly database: Database;
  constructor(dependencies: DrizzleOutboxRepositoryDependencies) {
    super();
    this.database = dependencies.database;
  }

  async enqueue(params: EnqueueMessageParams): Promise<void> {
    await this.database.insert(outboxMessages).values({
      channel: params.channel,
      recipient: params.recipient,
      subject: params.subject,
      template: params.template,
      payload: params.payload,
    });
  }

  async claimPending(params: { limit: number }): Promise<OutboxMessage[]> {
    return this.database.transaction(async (transaction) => {
      const rows = await transaction.select().from(outboxMessages).where(eq(outboxMessages.status, "pending"))
        .orderBy(asc(outboxMessages.createdAt)).limit(Math.min(Math.max(params.limit, 1), 100)).for("update", { skipLocked: true });
      if (!rows.length) return [];
      const selected: OutboxMessage[] = [];
      for (const row of rows) {
        const [updated] = await transaction.update(outboxMessages).set({ status: "processing", attempts: row.attempts + 1, updatedAt: new Date() }).where(eq(outboxMessages.id, row.id)).returning();
        if (updated) selected.push({
          id: updated.id,
          channel: updated.channel as "email" | "whatsapp",
          recipient: updated.recipient,
          subject: updated.subject,
          template: updated.template,
          payload: updated.payload,
          attempts: updated.attempts,
          createdAt: updated.createdAt,
        });
      }
      return selected;
    });
  }

  async update(params: UpdateOutboxParams): Promise<void> {
    await this.database.update(outboxMessages).set({ status: params.status, lastError: params.lastError ?? null, sentAt: params.status === "sent" ? new Date() : null, updatedAt: new Date() }).where(eq(outboxMessages.id, params.id));
  }
}
