import type { RegisterAnswerInput, RegisterParticipantInput } from '../../../application/use-cases/register-for-event/register-for-event.input.dto';

export type RegistrationConsentsBody = {
  termsVersion?: string;
  privacyVersion?: string;
  marketingAccepted?: boolean;
};

export type RegistrationActionRequest =
  | {
      action: 'register';
      body: {
        eventId?: string | null;
        eventSlug?: string | null;
        participant?: Partial<RegisterParticipantInput>;
        answers?: RegisterAnswerInput[];
        consents?: RegistrationConsentsBody;
        couponCode?: string | null;
        isCourtesy?: boolean;
        courtesyReason?: string | null;
      };
    }
  | { action: 'detail'; code: string }
  | { action: 'mine' }
  | { action: 'mineByParticipant'; participantId: string }
  | { action: 'cancelMine'; code: string; body: { reason?: string } }
  | { action: 'credential'; code: string };

export type RegistrationAdminListQuery = {
  eventId?: string;
  participantId?: string;
  status?: string;
  search?: string;
  includingCancelled?: string;
  page?: string;
  perPage?: string;
};

export type RegistrationAdminActionRequest =
  | {
      action: 'list';
      query: RegistrationAdminListQuery;
    }
  | { action: 'detail'; registrationId: string }
  | { action: 'cancel'; registrationId: string; body: { reason?: string } }
  | { action: 'promote'; registrationId: string }
  | {
      action: 'checkIn';
      body: {
        credentialToken?: string | null;
        code?: string | null;
        registrationId?: string | null;
        override?: boolean;
        overrideReason?: string | null;
      };
    }
  | { action: 'checkIns'; eventId: string }
  | { action: 'expireReservations'; body: { limit?: number } };
