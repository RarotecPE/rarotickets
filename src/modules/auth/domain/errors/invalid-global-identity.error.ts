import { DomainError } from '../../../../@core/domain/errors/domain-error.base';

export class InvalidGlobalIdentityError extends DomainError {
  constructor() {
    super({
      code: 'INVALID_GLOBAL_IDENTITY',
      message: 'A identidade retornada pelo RaroNexus é inválida.',
    });
  }
}
