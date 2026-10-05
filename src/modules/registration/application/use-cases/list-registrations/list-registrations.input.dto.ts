export type ListRegistrationsInputDto = {
  eventId?: string | null;
  participantId?: string | null;
  status?: string | null;
  search?: string | null;
  includingCancelled?: boolean;
  page?: number;
  perPage?: number;
};
