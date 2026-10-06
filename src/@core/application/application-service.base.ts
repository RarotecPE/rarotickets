import { Result } from '../domain/result';

export abstract class ApplicationService<Input, Output> {
  abstract execute(input: Input): Promise<Result<Output>>;
}
