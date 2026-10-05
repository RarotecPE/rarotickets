export type CreateCouponInputDto = {
  eventId: string;
  code: string;
  type: string;
  value: number;
  maxUses: number;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  actorUserId?: string | null;
  actorName?: string | null;
  ip?: string | null;
};
