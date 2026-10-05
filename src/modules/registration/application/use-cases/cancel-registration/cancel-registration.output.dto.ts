import type { RegistrationDto } from '../../mappers/registration.mapper';

export type CancelRegistrationOutputDto = {
  registration: RegistrationDto;
  seatReleased: boolean;
  financialReviewRequired: boolean;
};
