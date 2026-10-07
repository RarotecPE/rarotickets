import { Identifier } from "./identifier";

export type EntityConstructorParams<Props> = { props: Props; id?: Identifier };
export type EntityEqualsParams<Props> = { other?: Entity<Props> };

export abstract class Entity<Props> {
  protected readonly _id: Identifier;
  protected readonly props: Props;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  protected constructor(params: EntityConstructorParams<Props>) {
    this._id = params.id ?? Identifier.create();
    this.props = params.props;
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  get id(): Identifier {
    return this._id;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  protected touch(): void {
    this._updatedAt = new Date();
  }

  public equals({ other }: EntityEqualsParams<Props>): boolean {
    if (!other || !(other instanceof Entity)) return false;
    return this._id.equals({ other: other._id });
  }
}
