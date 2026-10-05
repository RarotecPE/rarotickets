import { Result } from './result';

/** Factories dedicadas encapsulam criação complexa (create como instância). */
export abstract class Factory<Input, Output> {
  abstract create(params: Input): Result<Output>;
}
