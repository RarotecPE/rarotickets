export type ListEventsInputDto = {
  search?: string | null;
  status?: string | null;
  type?: string | null;
  city?: string | null;
  state?: string | null;
  startDateFrom?: string | null;
  startDateTo?: string | null;
  onlyPublic?: boolean;
  onlyUpcoming?: boolean;
  page?: number;
  perPage?: number;
};
