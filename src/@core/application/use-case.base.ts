import { ApplicationService } from './application-service.base.ts';
import type { IUseCase } from './use-case.interface.ts';

export abstract class UseCase<Input, Output, ErrorType = Error>
  extends ApplicationService<Input, Output, ErrorType>
  implements IUseCase<Input, Output, ErrorType> {}
