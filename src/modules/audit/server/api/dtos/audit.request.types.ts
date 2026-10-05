export type ListAuditEntriesQuery = {
  actorUserId?: string;
  entity?: string;
  action?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
};

export type AuditActionRequest = { action: 'list'; query: ListAuditEntriesQuery };
