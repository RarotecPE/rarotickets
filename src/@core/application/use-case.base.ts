import { ApplicationService } from "./application-service.base";

export abstract class UseCase<Input, Output> extends ApplicationService<Input, Output> {}
