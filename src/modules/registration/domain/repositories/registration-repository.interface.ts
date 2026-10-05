import { Result } from '@core/domain/result';
import type { CheckIn } from '../entities/check-in.entity';
import type { Registration } from '../entities/registration.entity';
import type { RegistrationStatusValue } from '../value-objects/registration-status.vo';

export type RegistrationId = string;
export type RegistrationFilter = {
  eventId?: string | null;
  participantId?: string | null;
  status?: RegistrationStatusValue | null;
  search?: string | null;
  includingCancelled?: boolean;
  page: number;
  perPage: number;
};
export type ListRegistrationsResult = { registrations: Registration[]; total: number };
export type SeatUsageInLock = {
  capacity: number;
  occupiedSeats: number;
  reservedSeats: number;
  waitlistCount: number;
  availableSeats: number;
};
export type CheckInRecord = {
  registrationId: string;
  eventId: string;
  checkedInAt: Date;
  checkedInBy: string | null;
  operatorName: string | null;
  method: 'QR_CODE' | 'MANUAL';
  isOverride: boolean;
  overrideReason: string | null;
};

/** Contexto disponível dentro do bloqueio de vaga do evento (§3). */
export type SeatLockContext = {
  seatUsage(): Promise<SeatUsageInLock>;
  findActiveRegistration(params: { participantId: string }): Promise<Registration | null>;
  nextWaitlistPosition(): Promise<number>;
  save(registration: Registration): Promise<void>;
};
export type SeatLockHandler<Output> = (context: SeatLockContext) => Promise<Result<Output>>;
export type WithSeatLockParams<Output> = { eventId: string; handler: SeatLockHandler<Output> };

/**
 * Bloqueio pessimista na linha do evento: impede que inscrições simultâneas
 * ultrapassem a capacidade (§3) e serializa a decisão de vaga.
 */
export interface IRegistrationRepository {
  findById(id: RegistrationId): Promise<Registration | null>;
  findByCode(code: string): Promise<Registration | null>;
  findActiveByEventAndParticipant(params: { eventId: string; participantId: string }): Promise<Registration | null>;
  list(params: RegistrationFilter): Promise<ListRegistrationsResult>;
  listByParticipant(participantId: string): Promise<Registration[]>;
  listExpiredReservations(params: { at: Date; limit: number }): Promise<Registration[]>;
  nextWaitlistPosition(eventId: string): Promise<number>;
  listWaitingList(eventId: string): Promise<Registration[]>;
  withSeatLock<Output>(params: WithSeatLockParams<Output>): Promise<Result<Output>>;
  save(registration: Registration): Promise<void>;
  update(registration: Registration): Promise<void>;
  saveCheckIn(checkIn: CheckIn): Promise<void>;
  findCheckIn(registrationId: string): Promise<CheckInRecord | null>;
  listCheckInsByEvent(eventId: string): Promise<CheckInRecord[]>;
}

export const REGISTRATION_REPOSITORY = Symbol('IRegistrationRepository');
