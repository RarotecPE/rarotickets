import { DomainError } from '../../../../@core/domain/errors/domain-error.base';

export class InvalidEventLocationError extends DomainError {
  constructor() {
    super({ code: 'INVALID_EVENT_LOCATION', message: 'Eventos online precisam de um link HTTP ou HTTPS válido.' });
  }
}
