export type ResultConstructorParams<T, E> = {
  isSuccess: boolean;
  value?: T;
  error?: E;
};

/**
 * Result Pattern — evita exceptions para erros de domínio.
 */
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
    if (this.isFailure) {
      throw new Error("Cannot get value of a failed result");
    }
    return this._value as T;
  }

  get error(): E {
    if (this.isSuccess) {
      throw new Error("Cannot get error of a successful result");
    }
    return this._error as E;
  }

  public static ok<T>(value?: T): Result<T> {
    return new Result<T, Error>({ isSuccess: true, value });
  }

  public static fail<T, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>({ isSuccess: false, error });
  }

  public static combine<T>(results: Result<T>[]): Result<T[]> {
    for (const r of results) {
      if (r.isFailure) return Result.fail(r.error);
    }
    return Result.ok(results.map((r) => r.value));
  }
}
