import { Entity } from "./entity.base";

export abstract class AggregateRoot<Props> extends Entity<Props> {
  protected constructor(params: AggregateRootConstructorParams<Props>) {
    super(params);
  }
}

export type AggregateRootConstructorParams<Props> = {
  id: import("./identifier").Identifier;
  props: Props;
  createdAt: Date;
  updatedAt: Date;
};
