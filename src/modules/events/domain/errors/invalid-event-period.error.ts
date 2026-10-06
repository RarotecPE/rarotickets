import { DomainError } from '../../../../@core/domain/errors/domain-error.base';

export class InvalidEventPeriodError extends DomainError {
  constructor() {
    super({ code: 'INVALID_EVENT_PERIOD', message: 'Informe datas válidas e garanta que o término seja posterior ao início.' });
  }
}
