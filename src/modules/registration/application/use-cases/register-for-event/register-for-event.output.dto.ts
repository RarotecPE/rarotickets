import type { RegistrationSnapshot } from '../../../domain/entities/registration.aggregate.ts';

export type RegisterForEventOutputDto = {
  registration: RegistrationSnapshot;
  wasWaitlisted: boolean;
  communicationQueued: boolean;
  consentsPersisted: boolean;
  auditPersisted: boolean;
};
