import type { DomainEvent } from '@core/domain/domain-event.base';
import { Result } from '@core/domain/result';

export interface IEventHandler<Event extends DomainEvent = DomainEvent> {
  subscribeTo(): string[];
  handle(event: Event): Promise<Result<void>>;
}
