export type CouponListQuery = {
  eventId?: string;
  search?: string;
  isActive?: string;
  page?: string;
  perPage?: string;
};

export type CouponActionRequest =
  | { action: 'validate'; body: { eventId?: string; code?: string; amountCents?: number } }
  | { action: 'list'; query: CouponListQuery }
  | { action: 'create'; body: Record<string, unknown> }
  | { action: 'update'; couponId: string; body: Record<string, unknown> }
  | { action: 'deactivate'; couponId: string };
