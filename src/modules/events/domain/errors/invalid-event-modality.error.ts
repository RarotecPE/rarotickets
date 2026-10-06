import { DomainError } from '../../../../@core/domain/errors/domain-error.base';

export class InvalidEventModalityError extends DomainError {
  constructor() {
    super({ code: 'INVALID_EVENT_MODALITY', message: 'Escolha um formato presencial ou online.' });
  }
}
