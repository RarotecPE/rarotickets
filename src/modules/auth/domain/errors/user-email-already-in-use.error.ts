import { ConflictError } from '@core/domain/errors/conflict.error';

export type UserEmailAlreadyInUseErrorParams = { email: string };

export class UserEmailAlreadyInUseError extends ConflictError {
  constructor(params: UserEmailAlreadyInUseErrorParams) {
    super({ message: `Já existe um usuário com o e-mail ${params.email}`, code: 'USER_EMAIL_ALREADY_IN_USE' });
  }
}
