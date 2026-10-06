import { DomainError } from '../../../../@core/domain/errors/domain-error.base';

export class InvalidEventCapacityError extends DomainError {
  constructor() {
    super({ code: 'INVALID_EVENT_CAPACITY', message: 'A capacidade deve ser um número inteiro maior que zero.' });
  }
}
