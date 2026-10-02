import type { Result } from './result.ts';

export abstract class DomainService<Input, Output, ErrorType = Error> {
  abstract execute(params: Input): Result<Output, ErrorType>;
}
