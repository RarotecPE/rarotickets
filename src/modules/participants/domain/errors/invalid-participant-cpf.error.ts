import { DomainError } from '../../../../@core/domain/errors/domain-error.base';

export class InvalidParticipantCpfError extends DomainError {
  constructor() {
    super({ code: 'INVALID_PARTICIPANT_CPF', message: 'Informe um CPF válido.' });
  }
}
