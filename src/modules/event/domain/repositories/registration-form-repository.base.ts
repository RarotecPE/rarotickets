import type { RegistrationForm } from '../entities/registration-form.aggregate.ts';
import type {
  IRegistrationFormRepository,
  RegistrationFormForEventParams,
  RegistrationFormId,
} from './registration-form-repository.interface.ts';

export abstract class RegistrationFormRepository implements IRegistrationFormRepository {
  abstract findById(id: RegistrationFormId): Promise<RegistrationForm | null>;
  abstract findActiveForEvent(params: RegistrationFormForEventParams): Promise<RegistrationForm | null>;
  abstract save(form: RegistrationForm): Promise<void>;
}
