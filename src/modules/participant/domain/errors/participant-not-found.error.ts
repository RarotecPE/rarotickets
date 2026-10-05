import { NotFoundError } from '@core/domain/errors/not-found.error';

export type ParticipantNotFoundErrorParams = { participantId?: string; identifier?: string };

export class ParticipantNotFoundError extends NotFoundError {
  constructor(params: ParticipantNotFoundErrorParams = {}) {
    const reference = params.participantId ?? params.identifier ?? 'informado';
    super({ message: `Participante "${reference}" não encontrado`, code: 'PARTICIPANT_NOT_FOUND' });
  }
}
