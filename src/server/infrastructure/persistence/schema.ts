import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const eventStatusEnum = pgEnum("event_status", ["rascunho", "agendado", "inscricoes_abertas", "inscricoes_encerradas", "em_andamento", "finalizado", "cancelado"]);
export const eventModalityEnum = pgEnum("event_modality", ["presencial", "online"]);
export const eventChargeTypeEnum = pgEnum("event_charge_type", ["gratuito", "pago"]);
export const registrationStatusEnum = pgEnum("registration_status", ["pendente", "aguardando_pagamento", "confirmada", "cancelada", "lista_espera"]);
export const paymentStatusEnum = pgEnum("payment_status", ["aguardando", "pago", "recusado", "cancelado", "expirado", "estornado"]);
export const discountTypeEnum = pgEnum("discount_type", ["percentual", "valor_fixo", "cortesia"]);
export const formFieldTypeEnum = pgEnum("form_field_type", ["texto", "texto_longo", "numero", "data", "email", "telefone", "cpf", "cnpj", "select", "checkbox", "boolean", "arquivo"]);

const createdAt = () => timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull();
const updatedAt = () => timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull();

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 140 }).notNull(),
  description: text("description").notNull(),
  summary: varchar("summary", { length: 220 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull(),
  bannerUrl: text("banner_url"),
  modality: eventModalityEnum("modality").notNull(),
  chargeType: eventChargeTypeEnum("charge_type").notNull(),
  status: eventStatusEnum("status").default("rascunho").notNull(),
  startAt: timestamp("start_at", { withTimezone: true, mode: "date" }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true, mode: "date" }).notNull(),
  registrationStartAt: timestamp("registration_start_at", { withTimezone: true, mode: "date" }).notNull(),
  registrationEndAt: timestamp("registration_end_at", { withTimezone: true, mode: "date" }).notNull(),
  maxCapacity: integer("max_capacity").notNull(),
  allowsWaitlist: boolean("allows_waitlist").default(false).notNull(),
  onlineUrl: text("online_url"),
  addressStreet: varchar("address_street", { length: 180 }),
  addressNumber: varchar("address_number", { length: 24 }),
  addressComplement: varchar("address_complement", { length: 160 }),
  addressNeighborhood: varchar("address_neighborhood", { length: 120 }),
  addressMunicipality: varchar("address_municipality", { length: 100 }),
  addressState: varchar("address_state", { length: 2 }),
  responsibleName: varchar("responsible_name", { length: 140 }).notNull(),
  responsibleEmail: varchar("responsible_email", { length: 254 }).notNull(),
  createdByGlobalUserId: varchar("created_by_global_user_id", { length: 180 }).notNull(),
  certificateEnabled: boolean("certificate_enabled").default(false).notNull(),
  workloadHours: integer("workload_hours").default(0).notNull(),
  certificateDescription: text("certificate_description"),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("events_slug_unique").on(table.slug),
  index("events_public_idx").on(table.status, table.registrationStartAt, table.startAt),
  index("events_owner_idx").on(table.createdByGlobalUserId),
  check("events_capacity_positive", sql`${table.maxCapacity} > 0`),
  check("events_dates_order", sql`${table.endAt} > ${table.startAt} AND ${table.registrationEndAt} <= ${table.endAt}`),
]);

export const ticketLots = pgTable("ticket_lots", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  name: varchar("name", { length: 100 }).notNull(),
  priceCents: integer("price_cents").notNull(),
  maxQuantity: integer("max_quantity").notNull(),
  startAt: timestamp("start_at", { withTimezone: true, mode: "date" }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true, mode: "date" }).notNull(),
  active: boolean("active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  index("ticket_lots_event_window_idx").on(table.eventId, table.active, table.startAt, table.endAt),
  check("ticket_lots_price_positive", sql`${table.priceCents} >= 0`),
  check("ticket_lots_quantity_positive", sql`${table.maxQuantity} > 0`),
]);

export const eventFormFields = pgTable("event_form_fields", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  label: varchar("label", { length: 120 }).notNull(),
  description: varchar("description", { length: 300 }),
  type: formFieldTypeEnum("type").notNull(),
  required: boolean("required").default(false).notNull(),
  options: jsonb("options").$type<string[]>().default([]).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("event_form_fields_order_idx").on(table.eventId, table.active, table.displayOrder)]);

export const eventActivities = pgTable("event_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description").notNull(),
  speakerName: varchar("speaker_name", { length: 140 }).notNull(),
  speakerBio: text("speaker_bio"),
  speakerPhotoUrl: text("speaker_photo_url"),
  room: varchar("room", { length: 120 }),
  startAt: timestamp("start_at", { withTimezone: true, mode: "date" }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("event_activities_schedule_idx").on(table.eventId, table.startAt)]);

export const participants = pgTable("participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  cpf: varchar("cpf", { length: 11 }),
  passport: varchar("passport", { length: 32 }),
  email: varchar("email", { length: 254 }).notNull(),
  phone: varchar("phone", { length: 24 }).notNull(),
  birthDate: timestamp("birth_date", { withTimezone: true, mode: "date" }),
  company: varchar("company", { length: 180 }),
  jobTitle: varchar("job_title", { length: 140 }),
  termsConsent: boolean("terms_consent").default(false).notNull(),
  marketingConsent: boolean("marketing_consent").default(false).notNull(),
  passwordHash: text("password_hash"),
  status: varchar("status", { length: 32 }).default("ativo").notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("participants_email_active_unique").on(table.email).where(sql`${table.deletedAt} IS NULL`),
  uniqueIndex("participants_cpf_active_unique").on(table.cpf).where(sql`${table.cpf} IS NOT NULL AND ${table.deletedAt} IS NULL`),
]);

export const participantAuthTokens = pgTable("participant_auth_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  participantId: uuid("participant_id").references(() => participants.id),
  type: varchar("type", { length: 32 }).notNull(),
  email: varchar("email", { length: 254 }).notNull(),
  cpf: varchar("cpf", { length: 11 }),
  tokenHash: varchar("token_hash", { length: 128 }).notNull(),
  code: varchar("code", { length: 12 }),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true, mode: "date" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("participant_auth_tokens_hash_unique").on(table.tokenHash),
  index("participant_auth_tokens_lookup_idx").on(table.type, table.email, table.expiresAt),
]);

export const coupons = pgTable("coupons", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").references(() => events.id),
  code: varchar("code", { length: 40 }).notNull(),
  type: discountTypeEnum("type").notNull(),
  discountValue: integer("discount_value").notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0).notNull(),
  startAt: timestamp("start_at", { withTimezone: true, mode: "date" }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true, mode: "date" }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("coupons_code_unique").on(table.code),
  index("coupons_event_active_idx").on(table.eventId, table.active),
  check("coupons_discount_nonnegative", sql`${table.discountValue} >= 0`),
  check("coupons_used_nonnegative", sql`${table.usedCount} >= 0`),
]);

export const registrations = pgTable("registrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 32 }).notNull(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  participantId: uuid("participant_id").notNull().references(() => participants.id),
  lotId: uuid("lot_id").references(() => ticketLots.id),
  couponId: uuid("coupon_id").references(() => coupons.id),
  answersSnapshot: jsonb("answers_snapshot").$type<Record<string, unknown>>().default({}).notNull(),
  originalCents: integer("original_cents").default(0).notNull(),
  discountCents: integer("discount_cents").default(0).notNull(),
  finalCents: integer("final_cents").default(0).notNull(),
  status: registrationStatusEnum("status").notNull(),
  reservationExpiresAt: timestamp("reservation_expires_at", { withTimezone: true, mode: "date" }),
  waitlistExpiresAt: timestamp("waitlist_expires_at", { withTimezone: true, mode: "date" }),
  accessTokenHash: varchar("access_token_hash", { length: 128 }).notNull(),
  credentialTokenHash: varchar("credential_token_hash", { length: 128 }),
  cancellationReason: text("cancellation_reason"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("registrations_code_unique").on(table.code),
  uniqueIndex("registrations_access_hash_unique").on(table.accessTokenHash),
  index("registrations_event_status_idx").on(table.eventId, table.status, table.createdAt),
  index("registrations_participant_idx").on(table.participantId, table.status),
  index("registrations_expiration_idx").on(table.status, table.reservationExpiresAt),
  check("registrations_money_nonnegative", sql`${table.originalCents} >= 0 AND ${table.discountCents} >= 0 AND ${table.finalCents} >= 0`),
]);

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  registrationId: uuid("registration_id").notNull().references(() => registrations.id),
  referenceId: varchar("reference_id", { length: 64 }).notNull(),
  provider: varchar("provider", { length: 24 }).default("pagbank").notNull(),
  status: paymentStatusEnum("status").default("aguardando").notNull(),
  method: varchar("method", { length: 32 }),
  amountCents: integer("amount_cents").notNull(),
  externalId: varchar("external_id", { length: 180 }),
  checkoutUrl: text("checkout_url"),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  paidAt: timestamp("paid_at", { withTimezone: true, mode: "date" }),
  refundedCents: integer("refunded_cents").default(0).notNull(),
  refundReason: text("refund_reason"),
  refundedAt: timestamp("refunded_at", { withTimezone: true, mode: "date" }),
  refundedByGlobalUserId: varchar("refunded_by_global_user_id", { length: 180 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("payments_registration_unique").on(table.registrationId),
  uniqueIndex("payments_reference_unique").on(table.referenceId),
  index("payments_status_idx").on(table.status),
  check("payments_amount_nonnegative", sql`${table.amountCents} >= 0 AND ${table.refundedCents} >= 0`),
]);

export const paymentWebhookEvents = pgTable("payment_webhook_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: varchar("provider", { length: 24 }).notNull(),
  providerEventId: varchar("provider_event_id", { length: 180 }).notNull(),
  paymentId: uuid("payment_id").references(() => payments.id),
  rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true, mode: "date" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("payment_webhook_events_provider_id_unique").on(table.provider, table.providerEventId)]);

export const checkins = pgTable("checkins", {
  id: uuid("id").defaultRandom().primaryKey(),
  registrationId: uuid("registration_id").notNull().references(() => registrations.id),
  eventId: uuid("event_id").notNull().references(() => events.id),
  operatorGlobalUserId: varchar("operator_global_user_id", { length: 180 }).notNull(),
  operatorName: varchar("operator_name", { length: 180 }).notNull(),
  happenedAt: timestamp("happened_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  type: varchar("type", { length: 32 }).default("normal").notNull(),
  justification: text("justification"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  index("checkins_event_date_idx").on(table.eventId, table.happenedAt),
  uniqueIndex("checkins_one_normal_per_registration").on(table.registrationId).where(sql`${table.type} = 'normal'`),
]);

export const certificates = pgTable("certificates", {
  id: uuid("id").defaultRandom().primaryKey(),
  registrationId: uuid("registration_id").notNull().references(() => registrations.id),
  eventId: uuid("event_id").notNull().references(() => events.id),
  participantId: uuid("participant_id").notNull().references(() => participants.id),
  authenticationCode: varchar("authentication_code", { length: 48 }).notNull(),
  workloadHours: integer("workload_hours").notNull(),
  descriptionSnapshot: text("description_snapshot").notNull(),
  eventTitleSnapshot: varchar("event_title_snapshot", { length: 140 }).notNull(),
  participantNameSnapshot: varchar("participant_name_snapshot", { length: 180 }).notNull(),
  eventStartSnapshot: timestamp("event_start_snapshot", { withTimezone: true, mode: "date" }).notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("certificates_registration_unique").on(table.registrationId),
  uniqueIndex("certificates_authentication_code_unique").on(table.authenticationCode),
]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 180 }).notNull(),
  userName: varchar("user_name", { length: 180 }).notNull(),
  action: varchar("action", { length: 120 }).notNull(),
  entity: varchar("entity", { length: 80 }).notNull(),
  recordId: varchar("record_id", { length: 180 }).notNull(),
  beforeData: jsonb("before_data").$type<Record<string, unknown> | null>(),
  afterData: jsonb("after_data").$type<Record<string, unknown> | null>(),
  ip: varchar("ip", { length: 80 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("audit_logs_entity_date_idx").on(table.entity, table.recordId, table.createdAt)]);

export const outboxMessages = pgTable("outbox_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  channel: varchar("channel", { length: 24 }).notNull(),
  recipient: varchar("recipient", { length: 254 }).notNull(),
  subject: varchar("subject", { length: 180 }).notNull(),
  template: varchar("template", { length: 80 }).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  status: varchar("status", { length: 24 }).default("pending").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  lastError: text("last_error"),
  sentAt: timestamp("sent_at", { withTimezone: true, mode: "date" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("outbox_pending_idx").on(table.status, table.createdAt)]);

export const registrationFiles = pgTable("registration_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  registrationId: uuid("registration_id").notNull().references(() => registrations.id),
  fieldId: uuid("field_id").notNull().references(() => eventFormFields.id),
  storageKey: text("storage_key").notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  private: boolean("private").default(true).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("registration_files_registration_idx").on(table.registrationId)]);

export type EventRow = typeof events.$inferSelect;
export type NewEventRow = typeof events.$inferInsert;
export type ParticipantRow = typeof participants.$inferSelect;
export type NewParticipantRow = typeof participants.$inferInsert;
export type ParticipantAuthTokenRow = typeof participantAuthTokens.$inferSelect;
export type NewParticipantAuthTokenRow = typeof participantAuthTokens.$inferInsert;
export type RegistrationRow = typeof registrations.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;
