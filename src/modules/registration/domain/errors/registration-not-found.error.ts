import { NotFoundError } from '@core/domain/errors/not-found.error';

export class RegistrationNotFoundError extends NotFoundError {
  constructor(reference: string) {
    super({ message: `Inscrição "${reference}" não encontrada`, code: 'REGISTRATION_NOT_FOUND' });
  }
}
