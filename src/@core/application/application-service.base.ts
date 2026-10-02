import type { Result } from '../domain/result.ts';

export abstract class ApplicationService<Input, Output, ErrorType = Error> {
  abstract execute(input: Input): Promise<Result<Output, ErrorType>>;
}
