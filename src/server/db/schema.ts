import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Tabelas principais
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  globalId: varchar("global_id", { length: 64 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  role: varchar("role", { length: 32 }).notNull().default("CONSULTA"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("users_global_id_unique").on(t.globalId),
  uniqueIndex("users_email_unique").on(t.email),
]);

export const events = pgTable("events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  modality: varchar("modality", { length: 16 }).notNull(),
  financialType: varchar("financial_type", { length: 16 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("RASCUNHO"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  capacity: integer("capacity").notNull(),
  address: text("address"),
  city: varchar("city", { length: 120 }),
  state: varchar("state", { length: 2 }),
  streamUrl: text("stream_url"),
  managerId: varchar("manager_id", { length: 64 }).notNull(),
  certificateEnabled: boolean("certificate_enabled").notNull().default(false),
  certificateHours: integer("certificate_hours"),
  certificateMinPresencePercent: integer("certificate_min_presence_percent").default(100),
  waitlistEnabled: boolean("waitlist_enabled").notNull().default(true),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  cancelReason: text("cancel_reason"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  customFormFields: jsonb("custom_form_fields").notNull().default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("events_status_idx").on(t.status),
  index("events_manager_idx").on(t.managerId),
  index("events_starts_idx").on(t.startsAt),
]);

export const lots = pgTable("lots", {
  id: varchar("id", { length: 36 }).primaryKey(),
  eventId: varchar("event_id", { length: 36 }).notNull().references(() => events.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  priceCents: integer("price_cents").notNull().default(0),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  totalSpots: integer("total_spots").notNull(),
  spotsTaken: integer("spots_taken").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("lots_event_idx").on(t.eventId),
  index("lots_active_range_idx").on(t.active, t.startsAt, t.endsAt),
]);

export const participants = pgTable("participants", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  documentKind: varchar("document_kind", { length: 16 }).notNull(),
  documentValue: varchar("document_value", { length: 32 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  company: varchar("company", { length: 200 }),
  role: varchar("role", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("participants_document_unique").on(t.documentKind, t.documentValue),
  index("participants_email_idx").on(t.email),
]);

export const coupons = pgTable("coupons", {
  id: varchar("id", { length: 36 }).primaryKey(),
  code: varchar("code", { length: 32 }).notNull(),
  type: varchar("type", { length: 16 }).notNull(),
  value: integer("value").notNull(),
  eventId: varchar("event_id", { length: 36 }).references(() => events.id, { onDelete: "set null" }),
  maxUses: integer("max_uses"),
  uses: integer("uses").notNull().default(0),
  active: boolean("active").notNull().default(true),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("coupons_code_unique").on(t.code),
]);

export const registrations = pgTable("registrations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  code: varchar("code", { length: 32 }).notNull(),
  eventId: varchar("event_id", { length: 36 }).notNull().references(() => events.id, { onDelete: "cascade" }),
  participantId: varchar("participant_id", { length: 36 }).notNull().references(() => participants.id),
  lotId: varchar("lot_id", { length: 36 }).references(() => lots.id),
  status: varchar("status", { length: 32 }).notNull().default("PENDENTE"),
  contractedPriceCents: integer("contracted_price_cents").notNull().default(0),
  discountAmountCents: integer("discount_amount_cents").notNull().default(0),
  finalPriceCents: integer("final_price_cents").notNull().default(0),
  couponId: varchar("coupon_id", { length: 36 }).references(() => coupons.id),
  answers: jsonb("answers").notNull().default("[]"),
  consentTerms: boolean("consent_terms").notNull().default(true),
  consentMarketing: boolean("consent_marketing").notNull().default(false),
  reservationExpiresAt: timestamp("reservation_expires_at", { withTimezone: true }),
  waitlistPosition: integer("waitlist_position"),
  cancellationReason: varchar("cancellation_reason", { length: 64 }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  credentialToken: varchar("credential_token", { length: 64 }),
  credentialQrPayload: text("credential_qr_payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("registrations_code_unique").on(t.code),
  index("registrations_event_idx").on(t.eventId),
  index("registrations_participant_idx").on(t.participantId),
  index("registrations_status_idx").on(t.status),
  index("registrations_reservation_idx").on(t.reservationExpiresAt),
  index("registrations_credential_token_idx").on(t.credentialToken),
]);

export const payments = pgTable("payments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  registrationId: varchar("registration_id", { length: 36 }).notNull().references(() => registrations.id, { onDelete: "cascade" }),
  externalReference: varchar("external_reference", { length: 64 }).notNull(),
  gatewayOrderId: varchar("gateway_order_id", { length: 128 }),
  amountCents: integer("amount_cents").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("CRIADO"),
  method: varchar("method", { length: 16 }),
  payloadRaw: text("payload_raw"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("payments_registration_idx").on(t.registrationId),
  uniqueIndex("payments_external_ref_unique").on(t.externalReference),
  index("payments_gateway_idx").on(t.gatewayOrderId),
]);

export const checkIns = pgTable("check_ins", {
  id: varchar("id", { length: 36 }).primaryKey(),
  registrationId: varchar("registration_id", { length: 36 }).notNull().references(() => registrations.id, { onDelete: "cascade" }),
  eventId: varchar("event_id", { length: 36 }).notNull().references(() => events.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 16 }).notNull().default("NAO_REALIZADO"),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  operatorId: varchar("operator_id", { length: 64 }),
  operatorName: varchar("operator_name", { length: 160 }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("checkins_registration_unique").on(t.registrationId),
  index("checkins_event_idx").on(t.eventId),
]);

export const certificates = pgTable("certificates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  registrationId: varchar("registration_id", { length: 36 }).notNull().references(() => registrations.id, { onDelete: "cascade" }),
  eventId: varchar("event_id", { length: 36 }).notNull().references(() => events.id, { onDelete: "cascade" }),
  participantName: varchar("participant_name", { length: 160 }).notNull(),
  eventTitle: varchar("event_title", { length: 200 }).notNull(),
  hours: integer("hours").notNull(),
  code: varchar("code", { length: 32 }).notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("certificates_registration_unique").on(t.registrationId),
  uniqueIndex("certificates_code_unique").on(t.code),
]);

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }).notNull(),
  userEmail: varchar("user_email", { length: 255 }),
  ip: varchar("ip", { length: 64 }),
  action: varchar("action", { length: 120 }).notNull(),
  entity: varchar("entity", { length: 64 }).notNull(),
  entityId: varchar("entity_id", { length: 64 }).notNull(),
  prevState: text("prev_state"),
  newState: text("new_state"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("audit_entity_idx").on(t.entity, t.entityId),
  index("audit_user_idx").on(t.userId),
  index("audit_created_idx").on(t.createdAt),
]);

export const paymentWebhooks = pgTable("payment_webhooks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  provider: varchar("provider", { length: 32 }).notNull(),
  externalId: varchar("external_id", { length: 128 }),
  rawPayload: text("raw_payload").notNull(),
  processed: boolean("processed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("webhooks_provider_ext_idx").on(t.provider, t.externalId),
]);
