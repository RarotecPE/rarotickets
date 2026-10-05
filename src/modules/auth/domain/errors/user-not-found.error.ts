import { NotFoundError } from '@core/domain/errors/not-found.error';

export type UserNotFoundErrorParams = { userId: string };

export class UserNotFoundError extends NotFoundError {
  constructor(params: UserNotFoundErrorParams) {
    super({ message: `Usuário "${params.userId}" não encontrado`, code: 'USER_NOT_FOUND' });
  }
}
