export type CouponSnapshot = {
  id: string;
  eventId: string;
  code: string;
  type: 'PERCENTUAL' | 'VALOR_FIXO' | 'CORTESIA';
  value: number;
  maxUses: number;
  usedCount: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
};

export type CouponReservationResult =
  | { status: 'RESERVED'; coupon: CouponSnapshot; discountCents: number }
  | { status: 'NOT_FOUND' }
  | { status: 'INVALID'; message: string }
  | { status: 'EXHAUSTED' };

export type ApplyCouponParams = {
  eventId: string;
  code: string;
  registrationId: string;
  amountCents: number;
  at: Date;
};

/** ACL do contexto de cupons usado no fluxo de inscrição (§25). */
export interface ICouponCatalog {
  findApplicable(params: { eventId: string; code: string; at: Date }): Promise<CouponSnapshot | null>;
  reserve(params: ApplyCouponParams): Promise<CouponReservationResult>;
  release(params: { registrationId: string }): Promise<void>;
}

export const COUPON_CATALOG = Symbol('ICouponCatalog');
