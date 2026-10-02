import type { Result } from '../domain/result.ts';
import type { DomainError } from '../domain/domain-error.base.ts';

export type CommunicationTrigger =
  | 'REGISTRATION_CREATED'
  | 'REGISTRATION_WAITLISTED'
  | 'REGISTRATION_CONFIRMED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'EVENT_UPDATED'
  | 'EVENT_CANCELLED'
  | 'EVENT_APPROACHING'
  | 'CERTIFICATE_AVAILABLE';
export type CommunicationChannel = 'EMAIL' | 'WHATSAPP';
export type EnqueueCommunicationParams = {
  trigger: CommunicationTrigger;
  eventId: string;
  registrationId: string;
  participantId: string;
  channels: CommunicationChannel[];
};

/** Must enqueue durably (rather than send synchronously) so business writes can be retried safely. */
export interface ICommunicationService {
  enqueue(params: EnqueueCommunicationParams): Promise<Result<void, DomainError>>;
}
