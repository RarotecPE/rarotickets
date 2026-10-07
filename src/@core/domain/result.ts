export type ResultConstructorParams<Value, Failure> = {
  isSuccess: boolean;
  value?: Value;
  error?: Failure;
};

export type MapResultParams<Value, Failure, NextValue> = {
  result: Result<Value, Failure>;
  mapper: (value: Value) => NextValue;
};

/** Isomorphic success/failure value used for domain and application outcomes. */
export class Result<Value, Failure = Error> {
  private readonly success: boolean;
  private readonly storedValue: Value | undefined;
  private readonly storedError: Failure | undefined;

  private constructor(params: ResultConstructorParams<Value, Failure>) {
    this.success = params.isSuccess;
    this.storedValue = params.value;
    this.storedError = params.error;
    Object.freeze(this);
  }

  get isSuccess(): boolean {
    return this.success;
  }

  get isFailure(): boolean {
    return !this.success;
  }

  get value(): Value {
    if (!this.success) {
      throw new Error("Cannot read value from a failed Result");
    }
    return this.storedValue as Value;
  }

  get error(): Failure {
    if (this.success) {
      throw new Error("Cannot read error from a successful Result");
    }
    return this.storedError as Failure;
  }

  static ok<Value, Failure = Error>(value: Value): Result<Value, Failure> {
    return new Result<Value, Failure>({ isSuccess: true, value });
  }

  static fail<Value = never, Failure = Error>(error: Failure): Result<Value, Failure> {
    return new Result<Value, Failure>({ isSuccess: false, error });
  }

  static map<Value, Failure, NextValue>(params: MapResultParams<Value, Failure, NextValue>): Result<NextValue, Failure> {
    if (params.result.isFailure) {
      return Result.fail(params.result.error);
    }
    return Result.ok(params.mapper(params.result.value));
  }
}
