/**
 * Result Pattern — usa-se Result para TODOS os erros de domínio.
 * Exceptions ficam reservadas a falhas de infraestrutura e erros de programação.
 */
export type ResultConstructorParams<T, E> = { isSuccess: boolean; value?: T; error?: E };

export class Result<T, E = Error> {
  private readonly _isSuccess: boolean;
  private readonly _value?: T;
  private readonly _error?: E;

  private constructor(params: ResultConstructorParams<T, E>) {
    this._isSuccess = params.isSuccess;
    this._value = params.value;
    this._error = params.error;
  }

  get isSuccess(): boolean {
    return this._isSuccess;
  }

  get isFailure(): boolean {
    return !this._isSuccess;
  }

  get value(): T {
    if (this.isFailure) throw new Error('Não é possível obter o valor de um Result com falha');
    return this._value as T;
  }

  get error(): E {
    if (this.isSuccess) throw new Error('Não é possível obter o erro de um Result com sucesso');
    return this._error as E;
  }

  public static ok<T>(value?: T): Result<T> {
    return new Result<T, Error>({ isSuccess: true, value });
  }

  public static fail<T, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>({ isSuccess: false, error });
  }

  public static combine<T, E>(results: Result<T, E>[]): Result<T[], E> {
    const values: T[] = [];
    for (const result of results) {
      if (result.isFailure) return Result.fail<T[], E>(result.error);
      values.push(result.value);
    }
    return new Result<T[], E>({ isSuccess: true, value: values });
  }
}
