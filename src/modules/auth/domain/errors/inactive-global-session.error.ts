import { DomainError } from '../../../../@core/domain/errors/domain-error.base';

export class InactiveGlobalSessionError extends DomainError {
  constructor() {
    super({
      code: 'INACTIVE_GLOBAL_SESSION',
      message: 'A sessão global do RaroNexus não está ativa.',
    });
  }
}
