import type { FormAnswers } from '../../../../event/domain/entities/registration-form.aggregate.ts';
import type { ConsentType } from '../../../../privacy/domain/entities/consent-record.entity.ts';

export type ConsentSubmission = { type: ConsentType; version: string; accepted: boolean };
export type RegisterForEventInputDto = {
  eventId: string;
  participantId: string;
  answers: FormAnswers;
  couponCode: string | null;
  isPublic: boolean;
  actorId: string | null;
  administrativeReason: string | null;
  consents: ConsentSubmission[];
};
