import { DomainError } from '@core/domain/errors/domain-error.base';

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super({ message: 'E-mail ou senha inválidos', code: 'INVALID_CREDENTIALS' });
  }
}
