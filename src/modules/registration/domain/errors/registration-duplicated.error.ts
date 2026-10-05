import { ConflictError } from '@core/domain/errors/conflict.error';

export class RegistrationDuplicatedError extends ConflictError {
  constructor() {
    super({
      message: 'Este participante já possui uma inscrição ativa neste evento',
      code: 'REGISTRATION_DUPLICATED',
    });
  }
}
