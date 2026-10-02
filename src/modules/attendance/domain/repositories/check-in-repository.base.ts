import type { Result } from '../../../../@core/domain/result.ts';
import type { DomainError } from '../../../../@core/domain/domain-error.base.ts';
import type { CheckIn } from '../entities/check-in.entity.ts';
import type {
  CheckInByRegistrationParams,
  CheckInId,
  CheckInListParams,
  CreateCheckInIfAbsentOutput,
  CreateCheckInIfAbsentParams,
  ICheckInRepository,
} from './check-in-repository.interface.ts';

export abstract class CheckInRepository implements ICheckInRepository {
  abstract findById(id: CheckInId): Promise<CheckIn | null>;
  abstract findByRegistration(params: CheckInByRegistrationParams): Promise<CheckIn | null>;
  abstract listByEvent(params: CheckInListParams): Promise<CheckIn[]>;
  abstract createIfAbsent(params: CreateCheckInIfAbsentParams): Promise<Result<CreateCheckInIfAbsentOutput, DomainError>>;
  abstract save(checkIn: CheckIn): Promise<Result<void, DomainError>>;
}
