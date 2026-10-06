import { ParticipantCpf } from '../../../domain/value-objects/participant-cpf.vo';
import { ParticipantEmail } from '../../../domain/value-objects/participant-email.vo';
import { ParticipantName } from '../../../domain/value-objects/participant-name.vo';
import { ParticipantPassword } from '../../../domain/value-objects/participant-password.vo';
import type { LoginParticipantRequest, RegisterParticipantRequest } from '../../types/participant.types';

export type RegisterParticipantFormValues = {
  name: string;
  email: string;
  cpf: string;
  password: string;
  confirmPassword: string;
};
export type LoginParticipantFormValues = { email: string; password: string };
export type RegisterParticipantFormErrors = Partial<Record<keyof RegisterParticipantFormValues, string>>;
export type LoginParticipantFormErrors = Partial<Record<keyof LoginParticipantFormValues, string>>;
export type ValidateRegisterParticipantFormParams = { values: RegisterParticipantFormValues };
export type ValidateRegisterParticipantFormResult = { payload: RegisterParticipantRequest | null; errors: RegisterParticipantFormErrors };
export type ValidateLoginParticipantFormParams = { values: LoginParticipantFormValues };
export type ValidateLoginParticipantFormResult = { payload: LoginParticipantRequest | null; errors: LoginParticipantFormErrors };

export function validateRegisterParticipantForm(params: ValidateRegisterParticipantFormParams): ValidateRegisterParticipantFormResult {
  const values = params.values;
  const errors: RegisterParticipantFormErrors = {};
  const nameResult = ParticipantName.create(values.name);
  const emailResult = ParticipantEmail.create(values.email);
  const cpfResult = ParticipantCpf.create(values.cpf);
  const passwordResult = ParticipantPassword.create(values.password);
  if (nameResult.isFailure) errors.name = nameResult.error.message;
  if (emailResult.isFailure) errors.email = emailResult.error.message;
  if (cpfResult.isFailure) errors.cpf = cpfResult.error.message;
  if (passwordResult.isFailure) errors.password = passwordResult.error.message;
  if (values.confirmPassword !== values.password) errors.confirmPassword = 'As senhas não coincidem.';
  if (!nameResult.isSuccess || !emailResult.isSuccess || !cpfResult.isSuccess || !passwordResult.isSuccess || values.confirmPassword !== values.password) {
    return { payload: null, errors };
  }
  return {
    payload: {
      name: nameResult.value.value,
      email: emailResult.value.value,
      cpf: cpfResult.value.value,
      password: passwordResult.value.value,
    },
    errors,
  };
}

export function validateLoginParticipantForm(params: ValidateLoginParticipantFormParams): ValidateLoginParticipantFormResult {
  const emailResult = ParticipantEmail.create(params.values.email);
  const passwordResult = ParticipantPassword.create(params.values.password);
  const errors: LoginParticipantFormErrors = {};
  if (emailResult.isFailure) errors.email = emailResult.error.message;
  if (passwordResult.isFailure) errors.password = passwordResult.error.message;
  if (emailResult.isFailure || passwordResult.isFailure) return { payload: null, errors };
  return {
    payload: { email: emailResult.value.value, password: passwordResult.value.value },
    errors,
  };
}
