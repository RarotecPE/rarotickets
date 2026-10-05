export type ReportQuery = {
  eventId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: string;
  perPage?: string;
};

export type ReportActionRequest =
  | { action: 'dashboard'; query: ReportQuery }
  | { action: 'report'; reportKey: string; query: ReportQuery };
