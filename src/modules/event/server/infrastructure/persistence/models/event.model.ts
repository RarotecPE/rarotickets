export type EventModel = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  image_url: string | null;
  start_date: Date;
  end_date: Date;
  start_time: string;
  end_time: string;
  is_online: boolean;
  online_url: string | null;
  venue_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  capacity: number;
  registration_start: Date;
  registration_end: Date;
  responsible_name: string;
  responsible_email: string | null;
  workload_hours: string;
  type: string;
  status: string;
  certificate_enabled: boolean;
  certificate_text: string | null;
  certificate_template: string | null;
  certificate_requires_attendance: boolean;
  certificate_min_attendance_pct: number;
  waitlist_enabled: boolean;
  seat_reservation_minutes: number;
  max_installments: number;
  allow_pix: boolean;
  allow_boleto: boolean;
  allow_credit_card: boolean;
  min_installment_cents: number;
  form_version: number;
  created_by: string | null;
  published_at: Date | null;
  cancelled_at: Date | null;
  cancel_reason: string | null;
  created_at: Date;
  updated_at: Date;
};

export type EventModelData = Omit<EventModel, 'created_at' | 'updated_at'> & {
  created_at: Date;
  updated_at: Date;
};

export type EventLoteModel = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  start_date: Date;
  end_date: Date;
  max_quantity: number;
  price_cents: number;
  is_active: boolean;
  order_index: number;
  created_at: Date;
  updated_at: Date;
  sold_quantity?: string | number;
};

export type EventFormFieldModel = {
  id: string;
  event_id: string;
  field_key: string;
  label: string;
  description: string | null;
  field_type: string;
  is_required: boolean;
  order_index: number;
  options: string[];
  placeholder: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export type EventSpeakerModel = {
  id: string;
  event_id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  institution: string | null;
  order_index: number;
  created_at: Date;
  updated_at: Date;
};

export type EventActivityModel = {
  id: string;
  event_id: string;
  speaker_id: string | null;
  title: string;
  description: string | null;
  start_at: Date;
  end_at: Date;
  room: string | null;
  order_index: number;
  created_at: Date;
  updated_at: Date;
};

export type EventSeatUsageModel = {
  event_id: string;
  capacity: number;
  occupied_seats: string | number;
  reserved_seats: string | number;
  waitlist_count: string | number;
  available_seats: string | number;
};
