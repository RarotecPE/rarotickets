import type { Result } from '../../../../@core/domain/result.ts';
import type { DomainError } from '../../../../@core/domain/domain-error.base.ts';
import type { Registration } from '../entities/registration.aggregate.ts';
import type { Coupon } from '../entities/coupon.entity.ts';
import type {
  CancelRegistrationParams,
  ConfirmPaidRegistrationParams,
  ConfirmRegistrationAdministrativelyParams,
  RegistrationStatus,
  StartPaymentParams,
} from '../entities/registration.aggregate.ts';
import type {
  RegistrationId,
  RegistrationCode,
  RegistrationEventListParams,
  RegistrationParticipantListParams,
} from './registration-repository.types.ts';

export type RegistrationCapacity = number | null;
export type CreateRegistrationAtomicallyParams = {
  registration: Registration;
  coupon: Coupon | null;
  eventCapacity: RegistrationCapacity;
  batchCapacity: RegistrationCapacity;
  waitlistEnabled: boolean;
  now: Date;
};
export type CreateRegistrationAtomicallyOutput = { registration: Registration; wasWaitlisted: boolean };
export type StartPaymentAtomicallyParams = {
  registrationId: RegistrationId;
  paymentId: string;
  eventCapacity: RegistrationCapacity;
  batchCapacity: RegistrationCapacity;
  reservation: StartPaymentParams;
};
export type ConfirmPaidAtomicallyParams = {
  registrationId: RegistrationId;
  payment: ConfirmPaidRegistrationParams;
  eventCapacity: RegistrationCapacity;
  batchCapacity: RegistrationCapacity;
};
export type ConfirmAdministrativelyAtomicallyParams = {
  registrationId: RegistrationId;
  confirmation: ConfirmRegistrationAdministrativelyParams;
  eventCapacity: RegistrationCapacity;
  batchCapacity: RegistrationCapacity;
};
export type PromoteWaitlistAtomicallyParams = {
  registrationId: RegistrationId;
  now: Date;
  eventCapacity: RegistrationCapacity;
  batchCapacity: RegistrationCapacity;
};
export type CancelRegistrationAtomicallyParams = { registrationId: RegistrationId; cancellation: CancelRegistrationParams };
export type ReturnRegistrationToPendingParams = { registrationId: RegistrationId; now: Date };
export type ExpireReservationsParams = { now: Date };
export type CountRegistrationsParams = { eventId: string; statuses?: RegistrationStatus[] };
export type CountBatchOccupancyParams = { eventId: string; batchId: string; now: Date };

export interface IRegistrationRepository {
  findById(id: RegistrationId): Promise<Registration | null>;
  findByCode(code: RegistrationCode): Promise<Registration | null>;
  listByEvent(params: RegistrationEventListParams): Promise<Registration[]>;
  listByParticipant(params: RegistrationParticipantListParams): Promise<Registration[]>;
  countByEvent(params: CountRegistrationsParams): Promise<number>;
  countOccupiedSeatsByBatch(params: CountBatchOccupancyParams): Promise<number>;
  createAtomically(params: CreateRegistrationAtomicallyParams): Promise<Result<CreateRegistrationAtomicallyOutput, DomainError>>;
  startPaymentAtomically(params: StartPaymentAtomicallyParams): Promise<Result<Registration, DomainError>>;
  confirmPaidAtomically(params: ConfirmPaidAtomicallyParams): Promise<Result<Registration, DomainError>>;
  confirmAdministrativelyAtomically(params: ConfirmAdministrativelyAtomicallyParams): Promise<Result<Registration, DomainError>>;
  promoteWaitlistAtomically(params: PromoteWaitlistAtomicallyParams): Promise<Result<Registration, DomainError>>;
  cancelAtomically(params: CancelRegistrationAtomicallyParams): Promise<Result<Registration, DomainError>>;
  returnToPending(params: ReturnRegistrationToPendingParams): Promise<Result<Registration, DomainError>>;
  expireReservations(params: ExpireReservationsParams): Promise<number>;
}
