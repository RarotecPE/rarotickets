import type { Result } from "@/@core/domain/result";
import type { DomainError } from "@/@core/domain/errors/domain-error.base";

export type CheckInContextParams = {
  registrationId?: string;
  registrationCode?: string;
  at: Date;
};
export type CheckInContext = {
  registrationId: string;
  registrationCode: string;
  registrationStatus: string;
  eventId: string;
  eventTitle: string;
  eventStatus: string;
  eventStartAt: Date;
  eventEndAt: Date;
  eventDayMatches: boolean;
  participantName: string;
  alreadyCheckedIn: boolean;
  previousCheckInAt: Date | null;
  previousCheckInBy: string | null;
};
export type CreateCheckInParams = {
  registrationId: string;
  operatorId: string;
  operatorName: string;
  at: Date;
  type: "normal" | "reentrada_autorizada";
  justification: string | null;
};
export type CheckInResult = {
  accepted: boolean;
  registrationCode: string;
  participantName: string;
  eventTitle: string;
  happenedAt: Date;
  operatorName: string;
  reason: string | null;
  previousCheckInAt: Date | null;
};

export type CancelCheckInParams = {
  registrationId: string;
  checkInId?: string;
  actorId: string;
  actorName: string;
  canManageAll: boolean;
  at: Date;
  reason?: string | null;
};

export type CancelCheckInResult = {
  registrationId: string;
  registrationCode: string;
  participantName: string;
  cancelledCheckInId: string;
  checkInType: string;
  happenedAt: Date;
  operatorName: string;
};

export interface ICheckInRepository {
  findContext(params: CheckInContextParams): Promise<CheckInContext | null>;
  create(params: CreateCheckInParams): Promise<CheckInResult>;
  cancelCheckIn(params: CancelCheckInParams): Promise<Result<CancelCheckInResult, DomainError>>;
}

export abstract class CheckInRepository implements ICheckInRepository {
  abstract findContext(params: CheckInContextParams): Promise<CheckInContext | null>;
  abstract create(params: CreateCheckInParams): Promise<CheckInResult>;
  abstract cancelCheckIn(params: CancelCheckInParams): Promise<Result<CancelCheckInResult, DomainError>>;
}
