export type ResultConstructorParams<T, E> = {
  isSuccess: boolean;
  value: T | undefined;
  error: E | undefined;
};

/** Encapsulates domain success and failure without throwing business errors. */
export class Result<T, E = Error> {
  private readonly _isSuccess: boolean;
  private readonly _value: T | undefined;
  private readonly _error: E | undefined;

  private constructor(params: ResultConstructorParams<T, E>) {
    this._isSuccess = params.isSuccess;
    this._value = params.value;
    this._error = params.error;
  }

  public get isSuccess(): boolean {
    return this._isSuccess;
  }

  public get isFailure(): boolean {
    return !this._isSuccess;
  }

  public get value(): T {
    if (this.isFailure) {
      throw new Error('Cannot get value of a failed result');
    }
    return this._value as T;
  }

  public get error(): E {
    if (this.isSuccess) {
      throw new Error('Cannot get error of a successful result');
    }
    return this._error as E;
  }

  public static ok<T, E = Error>(value?: T): Result<T, E> {
    return new Result<T, E>({ isSuccess: true, value, error: undefined });
  }

  public static fail<T, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>({ isSuccess: false, value: undefined, error });
  }
}
