import { Result } from './result';

/** Concentra regras que envolvem múltiplas entidades ou Value Objects. */
export abstract class DomainService<Input, Output> {
  abstract execute(params: Input): Result<Output>;
}
