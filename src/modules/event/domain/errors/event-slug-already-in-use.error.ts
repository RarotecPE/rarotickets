import { ConflictError } from '@core/domain/errors/conflict.error';

export class EventSlugAlreadyInUseError extends ConflictError {
  constructor(slug: string) {
    super({ message: `Já existe um evento com o endereço "${slug}"`, code: 'EVENT_SLUG_ALREADY_IN_USE' });
  }
}
