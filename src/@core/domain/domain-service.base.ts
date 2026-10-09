import { Result } from "./result";

export abstract class DomainService<Input, Output> {
  abstract execute(params: Input): Result<Output>;
}
