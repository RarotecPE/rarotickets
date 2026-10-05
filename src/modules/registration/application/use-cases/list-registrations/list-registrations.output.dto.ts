import type { PaginationMeta } from '@core/application/pagination/pagination';
import type { RegistrationDto } from '../../mappers/registration.mapper';

export type ListedRegistrationDto = RegistrationDto & {
  participantName: string | null;
  participantEmail: string | null;
  eventTitle: string | null;
};

export type ListRegistrationsOutputDto = { registrations: ListedRegistrationDto[]; meta: PaginationMeta };
