import { Entity } from './entity.base';
import { DomainEvent } from './domain-event.base';

export abstract class AggregateRoot<Props> extends Entity<Props> {
  private pendingEvents: DomainEvent[] = [];

  get domainEvents(): DomainEvent[] {
    return [...this.pendingEvents];
  }

  protected addDomainEvent(event: DomainEvent): void {
    this.pendingEvents.push(event);
  }

  clearDomainEvents(): void {
    this.pendingEvents = [];
  }
}
