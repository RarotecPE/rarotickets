import type { OutboxMessage } from "../repositories/outbox-repository.interface";

export type DeliverNotificationParams = { message: OutboxMessage };
export interface INotificationProvider {
  send(params: DeliverNotificationParams): Promise<void>;
}
