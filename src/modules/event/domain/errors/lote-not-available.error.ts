import { DomainError } from '@core/domain/errors/domain-error.base';

export class LoteNotAvailableError extends DomainError {
  constructor() {
    super({
      message: 'Nenhum lote está vigente para este evento no momento',
      code: 'LOTE_NOT_AVAILABLE',
    });
  }
}
