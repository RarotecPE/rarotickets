export type ListParticipantsInputDto = {
  search?: string | null;
  city?: string | null;
  state?: string | null;
  company?: string | null;
  page?: number;
  perPage?: number;
};
