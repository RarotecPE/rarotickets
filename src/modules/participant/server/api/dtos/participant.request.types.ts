export type ParticipantAdminListQuery = {
  search?: string;
  city?: string;
  state?: string;
  company?: string;
  page?: string;
  perPage?: string;
};

export type ParticipantActionRequest =
  | { action: 'openSession'; body: { email?: string; cpf?: string } }
  | { action: 'closeSession'; token?: string | null }
  | { action: 'me' }
  | {
      action: 'updateProfile';
      body: {
        name?: string;
        email?: string;
        phone?: string | null;
        birthDate?: string | null;
        company?: string | null;
        jobTitle?: string | null;
        city?: string | null;
        state?: string | null;
      };
    }
  | {
      action: 'registerConsents';
      body: { consents?: Array<{ type?: string; version?: string; accepted?: boolean }> };
    }
  | { action: 'list'; query: ParticipantAdminListQuery }
  | { action: 'detail'; participantId: string };
