export type ChangeEventStatusInputDto = {
  eventId: string;
  nextStatus: string;
  reason?: string | null;
  actorUserId: string;
  actorName: string;
  ip?: string | null;
};
