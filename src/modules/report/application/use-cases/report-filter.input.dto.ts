export type ReportFilterInputDto = {
  eventId?: string | null;
  from?: string | null;
  to?: string | null;
  search?: string | null;
  page?: number;
  perPage?: number;
};
