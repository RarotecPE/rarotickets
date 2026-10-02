import type { RegistrationForm } from '../entities/registration-form.aggregate.ts';

export type RegistrationFormId = string;
export type RegistrationFormForEventParams = { eventId: string };

export interface IRegistrationFormRepository {
  findById(id: RegistrationFormId): Promise<RegistrationForm | null>;
  findActiveForEvent(params: RegistrationFormForEventParams): Promise<RegistrationForm | null>;
  save(form: RegistrationForm): Promise<void>;
}
