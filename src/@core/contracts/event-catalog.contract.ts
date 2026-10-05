export type EventRegistrationRules = {
  eventId: string;
  title: string;
  slug: string;
  status: string;
  type: 'GRATUITO' | 'PAGO';
  capacity: number;
  registrationStart: Date;
  registrationEnd: Date;
  waitlistEnabled: boolean;
  seatReservationMinutes: number;
  allowPix: boolean;
  allowBoleto: boolean;
  allowCreditCard: boolean;
  maxInstallments: number;
  minInstallmentCents: number;
  certificateEnabled: boolean;
  certificateRequiresAttendance: boolean;
  certificateMinAttendancePct: number;
};

export type EventSeatUsage = {
  capacity: number;
  occupiedSeats: number;
  reservedSeats: number;
  waitlistCount: number;
  availableSeats: number;
};

export type LoteSnapshot = {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  maxQuantity: number;
  priceCents: number;
  isActive: boolean;
  orderIndex: number;
  soldQuantity: number;
};

export type FormFieldSnapshot = {
  id: string;
  eventId: string;
  fieldKey: string;
  label: string;
  description: string | null;
  fieldType: string;
  isRequired: boolean;
  orderIndex: number;
  options: string[];
  placeholder: string | null;
  isActive: boolean;
};

export type EventFormSnapshot = { eventId: string; version: number; fields: FormFieldSnapshot[] };

export type EventCertificateSettings = {
  eventId: string;
  eventTitle: string;
  workloadHours: number;
  enabled: boolean;
  text: string | null;
  requiresAttendance: boolean;
  minAttendancePct: number;
};

/** Leitura do contexto de eventos por outros contextos (ACL). */
export interface IEventCatalog {
  findEventIdBySlug(params: { slug: string }): Promise<string | null>;
  getRegistrationRules(params: { eventId: string }): Promise<EventRegistrationRules | null>;
  getSeatUsage(params: { eventId: string }): Promise<EventSeatUsage | null>;
  getRegistrationForm(params: { eventId: string }): Promise<EventFormSnapshot | null>;
  getCertificateSettings(params: { eventId: string }): Promise<EventCertificateSettings | null>;
  listElegibleLotes(params: { eventId: string; at: Date }): Promise<LoteSnapshot[]>;
  touchEventVersion(params: { eventId: string }): Promise<void>;
}

export const EVENT_CATALOG = Symbol('IEventCatalog');
