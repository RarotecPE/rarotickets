import { DomainError } from '../../../../@core/domain/errors/domain-error.base';

export class ParticipantAlreadyRegisteredError extends DomainError {
  constructor() {
    super({ code: 'PARTICIPANT_ALREADY_REGISTERED', message: 'Já existe uma conta com esse e-mail ou CPF.' });
  }
}
