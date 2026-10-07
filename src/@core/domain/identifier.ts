import { randomUUID } from "crypto";

type IdentifierEqualsParams = { other?: Identifier };
// Alias para compatibilidade com Entity.equals
type EntityEqualsCompat = { entity?: Identifier };

/**
 * Identificador único baseado em UUIDv4.
 * Isomórfico: usa crypto web quando disponível, fallback compatível.
 */
export class Identifier {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  public toString(): string {
    return this._value;
  }

  public equals({ other }: IdentifierEqualsParams): boolean {
    if (!other) return false;
    if (!(other instanceof Identifier)) return false;
    return this._value === other._value;
  }

  public static create(): Identifier {
    // crypto.randomUUID é suportado em browsers modernos e Node 18+.
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : randomUUID();
    return new Identifier(id);
  }

  public static fromExisting(value: string): Identifier {
    return new Identifier(value);
  }
}
