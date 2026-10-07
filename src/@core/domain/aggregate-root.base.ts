import { Entity } from "./entity.base";
import type { EntityConstructorParams } from "./entity.base";
import { DomainEvent } from "./domain-event.base";

export abstract class AggregateRoot<Props> extends Entity<Props> {
  private _domainEvents: DomainEvent[] = [];

  protected constructor(params: EntityConstructorParams<Props>) {
    super(params);
  }

  get domainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }
}
