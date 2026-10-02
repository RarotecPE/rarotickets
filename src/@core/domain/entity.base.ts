import { Identifier } from './identifier.ts';

export type EntityConstructorParams<Props> = {
  props: Props;
  id?: Identifier;
  createdAt?: Date;
  updatedAt?: Date;
};
export type EntityEqualsParams<Props> = { entity?: Entity<Props> };
export type EntityTouchParams = { at?: Date };

export abstract class Entity<Props> {
  protected readonly _id: Identifier;
  protected readonly props: Props;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  protected constructor(params: EntityConstructorParams<Props>) {
    this._id = params.id ?? Identifier.create();
    this.props = params.props;
    this._createdAt = new Date((params.createdAt ?? new Date()).getTime());
    this._updatedAt = new Date((params.updatedAt ?? this._createdAt).getTime());
  }

  public get id(): Identifier {
    return this._id;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt);
  }

  public get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  protected touch(params: EntityTouchParams = {}): void {
    this._updatedAt = new Date(params.at ?? new Date());
  }

  public equals(params: EntityEqualsParams<Props>): boolean {
    return Boolean(params.entity && this._id.equals({ identifier: params.entity._id }));
  }
}
