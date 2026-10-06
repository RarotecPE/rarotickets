import { DomainError } from '../../../../@core/domain/errors/domain-error.base';

export class InvalidEventPriceError extends DomainError {
  constructor() {
    super({ code: 'INVALID_EVENT_PRICE', message: 'Eventos pagos precisam de um valor maior que zero; eventos gratuitos não possuem cobrança.' });
  }
}
