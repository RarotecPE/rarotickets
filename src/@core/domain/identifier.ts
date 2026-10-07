export type IdentifierValue = string;

export class Identifier {
  private readonly value: IdentifierValue;

  private constructor(value: IdentifierValue) {
    this.value = value;
    Object.freeze(this);
  }

  static fromExisting(value: IdentifierValue): Identifier {
    return new Identifier(value);
  }

  toString(): string {
    return this.value;
  }

  equals(params: IdentifierEqualsParams): boolean {
    return this.value === params.other.value;
  }
}

export type IdentifierEqualsParams = {
  other: Identifier;
};
