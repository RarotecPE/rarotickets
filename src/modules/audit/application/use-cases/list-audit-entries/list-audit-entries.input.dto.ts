export type ListAuditEntriesInputDto = {
  actorUserId?: string | null;
  entity?: string | null;
  action?: string | null;
  search?: string | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  perPage?: number;
};
