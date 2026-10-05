export type CheckInBoardQuery = {
  eventId?: string;
  search?: string;
  onlyOverrides?: string;
  page?: string;
  perPage?: string;
};

export type CheckInLookupQuery = { code?: string; eventId?: string };

export type CheckInActionRequest =
  | { action: 'board'; query: CheckInBoardQuery }
  | { action: 'lookup'; query: CheckInLookupQuery };
