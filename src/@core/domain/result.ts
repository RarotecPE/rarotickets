export type ResultConstructorParams<Value, ErrorType> = {
  isSuccess: boolean;
  value?: Value;
  error?: ErrorType;
};

export class Result<Value, ErrorType = Error> {
  private readonly success: boolean;
  private readonly resultValue?: Value;
  private readonly resultError?: ErrorType;

  private constructor(params: ResultConstructorParams<Value, ErrorType>) {
    this.success = params.isSuccess;
    this.resultValue = params.value;
    this.resultError = params.error;
  }

  get isSuccess(): boolean {
    return this.success;
  }

  get isFailure(): boolean {
    return !this.success;
  }

  get value(): Value {
    if (!this.success) throw new Error('Não é possível ler o valor de um Result com falha.');
    return this.resultValue as Value;
  }

  get error(): ErrorType {
    if (this.success) throw new Error('Não é possível ler o erro de um Result com sucesso.');
    return this.resultError as ErrorType;
  }

  static ok<Value = void>(value?: Value): Result<Value, never> {
    return new Result<Value, never>({ isSuccess: true, value });
  }

  static fail<Value = never, ErrorType = Error>(error: ErrorType): Result<Value, ErrorType> {
    return new Result<Value, ErrorType>({ isSuccess: false, error });
  }
}
