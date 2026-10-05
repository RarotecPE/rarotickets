import { DomainError } from '@core/domain/errors/domain-error.base';

export class UserInactiveError extends DomainError {
  constructor() {
    super({ message: 'Usuário inativo — acesso bloqueado', code: 'USER_INACTIVE' });
  }
}
