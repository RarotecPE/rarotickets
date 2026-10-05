export type ManageEventLoteAction = 'CREATE' | 'UPDATE';

export type ManageEventLoteInputDto = {
  eventId: string;
  action: ManageEventLoteAction;
  loteId?: string;
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  maxQuantity: number;
  priceCents: number;
  isActive?: boolean;
  orderIndex?: number;
  actorUserId: string;
  actorName: string;
  ip?: string | null;
};
