import { DomainError } from '../../../../@core/domain/errors/domain-error.base';

export class InvalidEventTitleError extends DomainError {
  constructor() {
    super({ code: 'INVALID_EVENT_TITLE', message: 'O título deve ter entre 3 e 120 caracteres.' });
  }
}
