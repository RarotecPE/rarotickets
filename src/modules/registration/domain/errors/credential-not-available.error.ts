import { DomainError } from '@core/domain/errors/domain-error.base';

export class CredentialNotAvailableError extends DomainError {
  constructor() {
    super({
      message: 'A credencial é liberada somente após a confirmação da inscrição',
      code: 'CREDENTIAL_NOT_AVAILABLE',
    });
  }
}
