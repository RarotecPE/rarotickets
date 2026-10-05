import type { RegistrationDto } from '../../mappers/registration.mapper';

export type PromoteFromWaitlistOutputDto = {
  registration: RegistrationDto;
  requiresPayment: boolean;
};
