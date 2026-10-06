import { DomainError } from '../../../../@core/domain/errors/domain-error.base';

export type ParticipantNotFoundErrorParams = { participantId: string };

export class ParticipantNotFoundError extends DomainError {
  constructor(params: ParticipantNotFoundErrorParams) {
    super({ code: 'PARTICIPANT_NOT_FOUND', message: `Participante "${params.participantId}" não encontrado.` });
  }
}
