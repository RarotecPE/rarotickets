export type DomainEventConstructorParams = { name: string };

export abstract class DomainEvent {
  readonly name: string;
  readonly occurredAt: Date;

  protected constructor(params: DomainEventConstructorParams) {
    this.name = params.name;
    this.occurredAt = new Date();
  }
}
