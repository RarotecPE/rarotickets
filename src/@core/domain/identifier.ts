export type IdentifierValue = string;

export class Identifier {
  private readonly identifierValue: IdentifierValue;

  private constructor(value: IdentifierValue) {
    this.identifierValue = value;
  }

  static create(): Identifier {
    const randomPart = Math.random().toString(36).slice(2, 12);
    const timePart = Date.now().toString(36);
    return new Identifier(`${timePart}-${randomPart}`);
  }

  static fromExisting(value: IdentifierValue): Identifier {
    return new Identifier(value);
  }

  toString(): string {
    return this.identifierValue;
  }

  equals(other: Identifier): boolean {
    return this.identifierValue === other.identifierValue;
  }
}
