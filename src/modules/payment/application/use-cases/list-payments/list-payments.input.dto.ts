export type ListPaymentsInputDto = {
  registrationId?: string | null;
  eventId?: string | null;
  participantId?: string | null;
  status?: string | null;
  method?: string | null;
  search?: string | null;
  page?: number;
  perPage?: number;
};
