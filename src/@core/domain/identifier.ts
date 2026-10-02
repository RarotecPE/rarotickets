export type IdentifierParams = { value: string };
export type IdentifierEqualsParams = { identifier?: Identifier };

/** Isomorphic identifier value used by entities and aggregates. */
export class Identifier {
  private readonly value: string;

  private constructor(params: IdentifierParams) {
    this.value = params.value;
  }

  public static create(value?: string): Identifier {
    const generatedValue = value ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    return new Identifier({ value: generatedValue });
  }

  /** Use only for trusted identifiers loaded from persistence. */
  public static fromExisting(value: string): Identifier {
    return new Identifier({ value });
  }

  public toString(): string {
    return this.value;
  }

  public equals(params: IdentifierEqualsParams): boolean {
    return params.identifier?.value === this.value;
  }
}
