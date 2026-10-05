import { DomainError } from '@core/domain/errors/domain-error.base';
import { EVENT_STATUS_LABELS } from '../value-objects/event-status.vo';
import type { EventStatusValue } from '../value-objects/event-status.vo';

export type InvalidEventStatusTransitionErrorParams = {
  from: EventStatusValue;
  to: EventStatusValue;
};

export class InvalidEventStatusTransitionError extends DomainError {
  constructor(params: InvalidEventStatusTransitionErrorParams) {
    super({
      message: `Não é possível alterar o status de "${EVENT_STATUS_LABELS[params.from]}" para "${EVENT_STATUS_LABELS[params.to]}"`,
      code: 'INVALID_EVENT_STATUS_TRANSITION',
    });
  }
}
