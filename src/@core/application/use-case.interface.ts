import { Result } from '@core/domain/result';

export interface IUseCase<Input, Output> {
  execute(input: Input): Promise<Result<Output>>;
}
