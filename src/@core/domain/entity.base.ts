import { Identifier } from "./identifier";

export type EntityConstructorParams<Props> = {
  id: Identifier;
  props: Props;
  createdAt: Date;
  updatedAt: Date;
};

export type EntityEqualsParams<Props> = {
  entity?: Entity<Props>;
};

export abstract class Entity<Props> {
  protected readonly _id: Identifier;
  protected readonly props: Props;
  private readonly _createdAt: Date;
  protected _updatedAt: Date;

  protected constructor(params: EntityConstructorParams<Props>) {
    this._id = params.id;
    this.props = params.props;
    this._createdAt = params.createdAt;
    this._updatedAt = params.updatedAt;
  }

  get id(): Identifier {
    return this._id;
  }

  get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  protected touch(params: EntityTouchParams): void {
    this._updatedAt = new Date(params.at.getTime());
  }

  equals(params: EntityEqualsParams<Props>): boolean {
    return Boolean(params.entity && this._id.toString() === params.entity._id.toString());
  }
}

export type EntityTouchParams = {
  at: Date;
};
