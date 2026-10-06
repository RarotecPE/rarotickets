import { DomainError } from '../../../../@core/domain/errors/domain-error.base';

export type EventNotFoundErrorParams = { eventId: string };

export class EventNotFoundError extends DomainError {
  constructor(params: EventNotFoundErrorParams) {
    super({ code: 'EVENT_NOT_FOUND', message: `O evento "${params.eventId}" não foi encontrado.` });
  }
}
