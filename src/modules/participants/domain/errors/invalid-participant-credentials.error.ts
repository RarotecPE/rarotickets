import { DomainError } from '../../../../@core/domain/errors/domain-error.base';

export class InvalidParticipantCredentialsError extends DomainError {
  constructor() {
    super({ code: 'INVALID_PARTICIPANT_CREDENTIALS', message: 'E-mail ou senha incorretos.' });
  }
}
