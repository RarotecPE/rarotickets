export type CheckInContextParams = { registrationId: string; at: Date };
export type CheckInContext = {
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

export interface ICheckInRepository {
  findContext(params: CheckInContextParams): Promise<CheckInContext | null>;
  create(params: CreateCheckInParams): Promise<CheckInResult>;
}

export abstract class CheckInRepository implements ICheckInRepository {
  abstract findContext(params: CheckInContextParams): Promise<CheckInContext | null>;
  abstract create(params: CreateCheckInParams): Promise<CheckInResult>;
}
