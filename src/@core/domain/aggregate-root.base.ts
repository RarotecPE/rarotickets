import { Entity } from './entity.base.ts';
import type { EntityConstructorParams } from './entity.base.ts';
import type { DomainEvent } from './domain-event.base.ts';

export abstract class AggregateRoot<Props> extends Entity<Props> {
  private _domainEvents: DomainEvent[] = [];

  protected constructor(params: EntityConstructorParams<Props>) {
    super(params);
  }

  public get domainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }
}
