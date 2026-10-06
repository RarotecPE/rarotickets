import { DomainError } from '../../../../@core/domain/errors/domain-error.base';

export class InvalidParticipantEmailError extends DomainError {
  constructor() {
    super({ code: 'INVALID_PARTICIPANT_EMAIL', message: 'Informe um e-mail válido.' });
  }
}
