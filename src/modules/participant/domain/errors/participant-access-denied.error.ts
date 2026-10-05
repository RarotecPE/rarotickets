import { UnauthorizedError } from '@core/domain/errors/unauthorized.error';

export class ParticipantAccessDeniedError extends UnauthorizedError {
  constructor() {
    super({ message: 'Dados não conferem com o cadastro do participante', code: 'PARTICIPANT_ACCESS_DENIED' });
  }
}
