import type { Result } from '../domain/result.ts';

export interface IUseCase<Input, Output, ErrorType = Error> {
  execute(input: Input): Promise<Result<Output, ErrorType>>;
}
