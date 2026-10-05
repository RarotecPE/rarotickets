export type ListEventsQuery = {
  search?: string;
  status?: string;
  type?: string;
  city?: string;
  state?: string;
  startDateFrom?: string;
  startDateTo?: string;
  page?: string;
  perPage?: string;
};

export type PublicEventRequest =
  | { action: 'list'; query: ListEventsQuery }
  | { action: 'detail'; slug: string };

export type EventAdminRequest =
  | { action: 'list'; query: ListEventsQuery }
  | { action: 'detail'; eventId: string }
  | { action: 'create'; body: Record<string, unknown> }
  | { action: 'update'; eventId: string; body: Record<string, unknown> }
  | { action: 'changeStatus'; eventId: string; body: { nextStatus: string; reason?: string | null } }
  | { action: 'saveForm'; eventId: string; body: { fields: Array<Record<string, unknown>> } }
  | { action: 'manageLote'; eventId: string; body: Record<string, unknown> }
  | { action: 'manageProgram'; eventId: string; body: Record<string, unknown> };
