import { Result } from '@core/domain/result';

/** Base de todo serviço de aplicação: orquestra sem conter regra de negócio. */
export abstract class ApplicationService<Input, Output> {
  abstract execute(input: Input): Promise<Result<Output>>;
}
