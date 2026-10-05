import type { Result } from '@core/domain/result';
import type { CheckIn } from '../entities/check-in.entity';
import type { Registration } from '../entities/registration.entity';
import type {
  CheckInRecord,
  IRegistrationRepository,
  ListRegistrationsResult,
  RegistrationFilter,
  RegistrationId,
  WithSeatLockParams,
} from './registration-repository.interface';

export abstract class RegistrationRepository implements IRegistrationRepository {
  abstract findById(id: RegistrationId): Promise<Registration | null>;
  abstract findByCode(code: string): Promise<Registration | null>;
  abstract findActiveByEventAndParticipant(params: {
    eventId: string;
    participantId: string;
  }): Promise<Registration | null>;
  abstract list(params: RegistrationFilter): Promise<ListRegistrationsResult>;
  abstract listByParticipant(participantId: string): Promise<Registration[]>;
  abstract listExpiredReservations(params: { at: Date; limit: number }): Promise<Registration[]>;
  abstract nextWaitlistPosition(eventId: string): Promise<number>;
  abstract listWaitingList(eventId: string): Promise<Registration[]>;
  abstract withSeatLock<Output>(params: WithSeatLockParams<Output>): Promise<Result<Output>>;
  abstract save(registration: Registration): Promise<void>;
  abstract update(registration: Registration): Promise<void>;
  abstract saveCheckIn(checkIn: CheckIn): Promise<void>;
  abstract findCheckIn(registrationId: string): Promise<CheckInRecord | null>;
  abstract listCheckInsByEvent(eventId: string): Promise<CheckInRecord[]>;
}
