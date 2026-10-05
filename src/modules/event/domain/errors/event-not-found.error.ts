import { NotFoundError } from '@core/domain/errors/not-found.error';

export type EventNotFoundErrorParams = { eventId?: string; slug?: string };

export class EventNotFoundError extends NotFoundError {
  constructor(params: EventNotFoundErrorParams = {}) {
    const reference = params.eventId ?? params.slug ?? 'informado';
    super({ message: `Evento "${reference}" não encontrado`, code: 'EVENT_NOT_FOUND' });
  }
}
