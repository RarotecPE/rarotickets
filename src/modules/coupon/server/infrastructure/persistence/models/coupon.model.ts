export type CouponModel = {
  id: string;
  event_id: string;
  code: string;
  type: string;
  value: string;
  max_uses: number;
  used_count: number;
  start_date: Date;
  end_date: Date;
  is_active: boolean;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};

export type CouponUsageModel = {
  id: string;
  coupon_id: string;
  registration_id: string;
  discount_cents: number;
  created_at: Date;
  released_at: Date | null;
};
