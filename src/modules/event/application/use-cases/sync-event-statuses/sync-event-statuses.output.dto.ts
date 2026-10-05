export type SyncEventStatusesOutputDto = {
  checked: number;
  changed: Array<{ eventId: string; from: string; to: string }>;
};
