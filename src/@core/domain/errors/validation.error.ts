import { DomainError } from "./domain-error.base";
import type { DomainErrorParams } from "./domain-error.base";

export class ValidationError extends DomainError {
  constructor(params: DomainErrorParams) {
    super(params);
    this.name = "ValidationError";
  }
}
