import { DomainError } from '@core/domain/errors/domain-error.base';
import { REGISTRATION_STATUS_LABELS } from '../value-objects/registration-status.vo';
import type { RegistrationStatusValue } from '../value-objects/registration-status.vo';

export class InvalidRegistrationStatusTransitionError extends DomainError {
  constructor(from: RegistrationStatusValue, to: RegistrationStatusValue) {
    super({
      message: `Não é possível alterar a inscrição de "${REGISTRATION_STATUS_LABELS[from]}" para "${REGISTRATION_STATUS_LABELS[to]}"`,
      code: 'INVALID_REGISTRATION_STATUS_TRANSITION',
    });
  }
}
