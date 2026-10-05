export type IdentifierValue = string;

/**
 * Gera um UUID v4 usando apenas APIs padrão disponíveis em Node e no browser
 * (Web Crypto). O fallback existe para ambientes sem `globalThis.crypto`.
 * O código permanece isomórfico: não importa `node:crypto`.
 */
export function generateUuid(): IdentifierValue {
  const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoRef?.randomUUID) return cryptoRef.randomUUID();

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export class Identifier {
  private readonly value: IdentifierValue;

  private constructor(value: IdentifierValue) {
    this.value = value;
  }

  public static create(): Identifier {
    return new Identifier(generateUuid());
  }

  /** Reconstrói um identificador já persistido (dados confiáveis). */
  public static fromExisting(value: IdentifierValue): Identifier {
    if (!value) throw new Error('Identificador inválido');
    return new Identifier(value);
  }

  public equals(identifier?: Identifier): boolean {
    if (!identifier) return false;
    return this.value === identifier.value;
  }

  public toString(): string {
    return this.value;
  }
}
