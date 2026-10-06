import { DomainError } from '../../../../@core/domain/errors/domain-error.base';

export class InvalidParticipantPasswordError extends DomainError {
  constructor() {
    super({ code: 'INVALID_PARTICIPANT_PASSWORD', message: 'A senha deve ter entre 8 e 128 caracteres.' });
  }
}
