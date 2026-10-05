import type { RegistrationDto } from '../../mappers/registration.mapper';

export type PerformCheckInOutputDto = {
  registration: RegistrationDto;
  participantName: string | null;
  eventTitle: string | null;
  checkedInAt: Date;
  isOverride: boolean;
};
