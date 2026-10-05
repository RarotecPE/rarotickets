import { ConflictError } from '@core/domain/errors/conflict.error';

export type ParticipantDuplicatedErrorParams = { field: 'CPF' | 'E-MAIL'; value: string };

export class ParticipantDuplicatedError extends ConflictError {
  constructor(params: ParticipantDuplicatedErrorParams) {
    super({
      message: `Já existe um participante cadastrado com este ${params.field} (${params.value})`,
      code: 'PARTICIPANT_DUPLICATED',
    });
  }
}
