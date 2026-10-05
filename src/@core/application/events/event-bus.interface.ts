import type { DomainEvent } from '@core/domain/domain-event.base';

export interface IEventBus {
  publish(events: DomainEvent[]): Promise<void>;
  subscribe(eventName: string, handlerName: string): void;
}
