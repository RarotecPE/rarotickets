export type CreateRegistrationCodeParams = { year: number };
export interface IRegistrationCodeProvider {
  create(params: CreateRegistrationCodeParams): string;
}
