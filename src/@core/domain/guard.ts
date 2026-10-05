export type GuardNullOrUndefinedParams = { value: unknown; argumentName: string; message?: string };
export type GuardBooleanParams = { condition: boolean; message: string; code?: string };

export type GuardResult = { isValid: boolean; message: string };

/**
 * Verificações técnicas reutilizáveis. Regras de negócio permanecem nos
 * Value Objects e nas Entidades — aqui só se protege contra valores inválidos.
 */
export class Guard {
  public static againstNullOrUndefined(params: GuardNullOrUndefinedParams): GuardResult {
    if (params.value === null || params.value === undefined) {
      return {
        isValid: false,
        message: params.message ?? `${params.argumentName} é obrigatório`,
      };
    }
    return { isValid: true, message: '' };
  }

  public static isTruthy(params: GuardBooleanParams): GuardResult {
    return params.condition
      ? { isValid: true, message: '' }
      : { isValid: false, message: params.message };
  }

  public static isValidDate(value: Date): boolean {
    return value instanceof Date && !Number.isNaN(value.getTime());
  }

  public static isPositiveInteger(value: number): boolean {
    return Number.isInteger(value) && value > 0;
  }

  public static isNonNegativeInteger(value: number): boolean {
    return Number.isInteger(value) && value >= 0;
  }

  public static isNonEmptyString(value: string): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }
}
