export type RegistrationModel = {
  id: string;
  code: string;
  event_id: string;
  participant_id: string;
  lote_id: string | null;
  status: string;
  seat_status: string;
  price_cents: number;
  discount_cents: number;
  final_amount_cents: number;
  lote_name: string | null;
  coupon_id: string | null;
  coupon_code: string | null;
  is_courtesy: boolean;
  courtesy_reason: string | null;
  payment_method: string | null;
  waitlist_position: number | null;
  reservation_expires_at: Date | null;
  form_version: number;
  notes: string | null;
  confirmed_at: Date | null;
  cancelled_at: Date | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};

export type RegistrationAnswerModel = {
  id: string;
  registration_id: string;
  field_id: string | null;
  field_key: string;
  field_label: string;
  field_type: string;
  value: string | null;
  created_at: Date;
};

export type CheckInModel = {
  id: string;
  registration_id: string;
  event_id: string;
  checked_in_at: Date;
  checked_in_by: string | null;
  operator_name: string | null;
  method: string;
  is_override: boolean;
  override_reason: string | null;
  created_at: Date;
};

export type SeatUsageModel = {
  capacity: number;
  occupied_seats: string | number;
  reserved_seats: string | number;
  waitlist_count: string | number;
  available_seats: string | number;
};
