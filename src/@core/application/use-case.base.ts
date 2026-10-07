import { ApplicationService } from "./application-service.base";
import type { IUseCase } from "./use-case.interface";

export abstract class UseCase<Input, Output>
  extends ApplicationService<Input, Output>
  implements IUseCase<Input, Output> {}
