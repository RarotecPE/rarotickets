import type { Result } from '../../../../@core/domain/result.ts';
import type { DomainError } from '../../../../@core/domain/domain-error.base.ts';
import type { CheckIn } from '../entities/check-in.entity.ts';

export type CheckInId = string;
export type CheckInByRegistrationParams = { registrationId: string };
export type CheckInListParams = { eventId: string; offset: number; limit: number };
export type CreateCheckInIfAbsentParams = { checkIn: CheckIn };
export type CreateCheckInIfAbsentOutput = { checkIn: CheckIn; wasCreated: boolean };

export interface ICheckInRepository {
  findById(id: CheckInId): Promise<CheckIn | null>;
  findByRegistration(params: CheckInByRegistrationParams): Promise<CheckIn | null>;
  listByEvent(params: CheckInListParams): Promise<CheckIn[]>;
  createIfAbsent(params: CreateCheckInIfAbsentParams): Promise<Result<CreateCheckInIfAbsentOutput, DomainError>>;
  save(checkIn: CheckIn): Promise<Result<void, DomainError>>;
}
