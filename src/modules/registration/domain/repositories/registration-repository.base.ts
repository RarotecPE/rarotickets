import type { IRegistrationRepository } from './registration-repository.interface.ts';
import type {
  CancelRegistrationAtomicallyParams,
  ConfirmAdministrativelyAtomicallyParams,
  ConfirmPaidAtomicallyParams,
  CountRegistrationsParams,
  CountBatchOccupancyParams,
  CreateRegistrationAtomicallyOutput,
  CreateRegistrationAtomicallyParams,
  ExpireReservationsParams,
  PromoteWaitlistAtomicallyParams,
  ReturnRegistrationToPendingParams,
  StartPaymentAtomicallyParams,
} from './registration-repository.interface.ts';
import type { Registration } from '../entities/registration.aggregate.ts';
import type {
  RegistrationId,
  RegistrationCode,
  RegistrationEventListParams,
  RegistrationParticipantListParams,
} from './registration-repository.types.ts';
import type { RegistrationStatus } from '../entities/registration.aggregate.ts';
import type { DomainError } from '../../../../@core/domain/domain-error.base.ts';
import type { Result } from '../../../../@core/domain/result.ts';

export type RegistrationStatusFilterParams = { status: RegistrationStatus; requested: RegistrationStatus[] | undefined };

export abstract class RegistrationRepository implements IRegistrationRepository {
  abstract findById(id: RegistrationId): Promise<Registration | null>;
  abstract findByCode(code: RegistrationCode): Promise<Registration | null>;
  abstract listByEvent(params: RegistrationEventListParams): Promise<Registration[]>;
  abstract listByParticipant(params: RegistrationParticipantListParams): Promise<Registration[]>;
  abstract countByEvent(params: CountRegistrationsParams): Promise<number>;
  abstract countOccupiedSeatsByBatch(params: CountBatchOccupancyParams): Promise<number>;
  abstract createAtomically(params: CreateRegistrationAtomicallyParams): Promise<Result<CreateRegistrationAtomicallyOutput, DomainError>>;
  abstract startPaymentAtomically(params: StartPaymentAtomicallyParams): Promise<Result<Registration, DomainError>>;
  abstract confirmPaidAtomically(params: ConfirmPaidAtomicallyParams): Promise<Result<Registration, DomainError>>;
  abstract confirmAdministrativelyAtomically(params: ConfirmAdministrativelyAtomicallyParams): Promise<Result<Registration, DomainError>>;
  abstract promoteWaitlistAtomically(params: PromoteWaitlistAtomicallyParams): Promise<Result<Registration, DomainError>>;
  abstract cancelAtomically(params: CancelRegistrationAtomicallyParams): Promise<Result<Registration, DomainError>>;
  abstract returnToPending(params: ReturnRegistrationToPendingParams): Promise<Result<Registration, DomainError>>;
  abstract expireReservations(params: ExpireReservationsParams): Promise<number>;

  protected isStatusIncluded(params: RegistrationStatusFilterParams): boolean {
    return !params.requested || params.requested.includes(params.status);
  }
}
