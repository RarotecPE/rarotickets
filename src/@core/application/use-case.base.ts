import { ApplicationService } from './application-service.base';
import type { IUseCase } from './use-case.interface';

/** Um Use Case representa exatamente uma ação do usuário. */
export abstract class UseCase<Input, Output>
  extends ApplicationService<Input, Output>
  implements IUseCase<Input, Output> {}
