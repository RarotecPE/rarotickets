import { DomainError } from './domain-error.base';
import type { DomainErrorParams } from './domain-error.base';

export abstract class ForbiddenError extends DomainError {
  protected constructor(params: DomainErrorParams) {
    super(params);
  }
}
