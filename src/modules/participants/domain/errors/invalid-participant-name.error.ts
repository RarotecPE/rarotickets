import { DomainError } from '../../../../@core/domain/errors/domain-error.base';

export class InvalidParticipantNameError extends DomainError {
  constructor() {
    super({ code: 'INVALID_PARTICIPANT_NAME', message: 'Informe um nome com pelo menos 2 caracteres.' });
  }
}
