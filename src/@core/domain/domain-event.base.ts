export type DomainEventConstructorParams = { name: string };

export abstract class DomainEvent {
  public readonly name: string;
  public readonly occurredAt: Date;

  protected constructor(params: DomainEventConstructorParams) {
    this.name = params.name;
    this.occurredAt = new Date();
  }
}
