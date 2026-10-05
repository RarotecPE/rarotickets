export type GetCheckInBoardInputDto = {
  eventId: string;
  search?: string | null;
  onlyOverrides?: boolean;
  page?: number;
  perPage?: number;
};
