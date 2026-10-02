import type { Result } from './result.ts';

export abstract class Factory<Input, Output, ErrorType = Error> {
  abstract create(params: Input): Result<Output, ErrorType>;
}
