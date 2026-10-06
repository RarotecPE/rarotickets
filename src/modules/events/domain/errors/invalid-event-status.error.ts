import { DomainError } from '../../../../@core/domain/errors/domain-error.base';

export class InvalidEventStatusError extends DomainError {
  constructor() {
    super({ code: 'INVALID_EVENT_STATUS', message: 'A situação informada não é válida para este evento.' });
  }
}
