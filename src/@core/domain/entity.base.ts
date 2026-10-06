import { Identifier } from './identifier';

export type EntityConstructorParams<Props> = {
  props: Props;
  id?: Identifier;
  createdAt?: Date;
  updatedAt?: Date;
};

export type EntityEqualsParams<Props> = { entity?: Entity<Props> };

export abstract class Entity<Props> {
  protected readonly idValue: Identifier;
  protected readonly props: Props;
  private readonly createdAtValue: Date;
  private updatedAtValue: Date;

  protected constructor(params: EntityConstructorParams<Props>) {
    this.idValue = params.id ?? Identifier.create();
    this.props = params.props;
    this.createdAtValue = new Date(params.createdAt ?? Date.now());
    this.updatedAtValue = new Date(params.updatedAt ?? Date.now());
  }

  get id(): Identifier {
    return this.idValue;
  }

  get createdAt(): Date {
    return this.createdAtValue;
  }

  get updatedAt(): Date {
    return this.updatedAtValue;
  }

  protected touch(): void {
    this.updatedAtValue = new Date();
  }

  equals(params: EntityEqualsParams<Props>): boolean {
    return Boolean(params.entity && this.idValue.equals(params.entity.idValue));
  }
}
