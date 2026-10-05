/** Relógio injetável — permite testar regras de prazo e expiração. */
export interface IClock {
  now(): Date;
}

export const CLOCK = Symbol('IClock');
