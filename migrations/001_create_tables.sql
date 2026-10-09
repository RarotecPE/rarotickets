-- RaroTickets — bootstrap do schema PostgreSQL.
-- Cria o schema atual da aplicação em um banco vazio.
-- Execute uma única vez, conectado ao banco de destino, com um usuário que
-- possa criar tipos, tabelas, índices e constraints.
-- Fonte: src/server/infrastructure/persistence/migrations/0000 e 0001.
-- Para bases novas gerenciadas pelo Drizzle, use `npm run db:migrate` em vez
-- deste arquivo. Não execute este bootstrap e o runner de migrations na mesma
-- base: este script não grava o histórico interno do Drizzle.

BEGIN;
SET LOCAL search_path TO public;

CREATE TYPE "public"."discount_type" AS ENUM('percentual', 'valor_fixo', 'cortesia');
CREATE TYPE "public"."event_charge_type" AS ENUM('gratuito', 'pago');
CREATE TYPE "public"."event_modality" AS ENUM('presencial', 'online');
CREATE TYPE "public"."event_status" AS ENUM('rascunho', 'agendado', 'inscricoes_abertas', 'inscricoes_encerradas', 'em_andamento', 'finalizado', 'cancelado');
CREATE TYPE "public"."form_field_type" AS ENUM('texto', 'texto_longo', 'numero', 'data', 'email', 'telefone', 'cpf', 'cnpj', 'select', 'checkbox', 'boolean', 'arquivo');
CREATE TYPE "public"."payment_status" AS ENUM('aguardando', 'pago', 'recusado', 'cancelado', 'expirado', 'estornado');
CREATE TYPE "public"."registration_status" AS ENUM('pendente', 'aguardando_pagamento', 'confirmada', 'cancelada', 'lista_espera');
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(180) NOT NULL,
	"user_name" varchar(180) NOT NULL,
	"action" varchar(120) NOT NULL,
	"entity" varchar(80) NOT NULL,
	"record_id" varchar(180) NOT NULL,
	"before_data" jsonb,
	"after_data" jsonb,
	"ip" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"authentication_code" varchar(48) NOT NULL,
	"workload_hours" integer NOT NULL,
	"description_snapshot" text NOT NULL,
	"event_title_snapshot" varchar(140) NOT NULL,
	"participant_name_snapshot" varchar(180) NOT NULL,
	"event_start_snapshot" timestamp with time zone NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"operator_global_user_id" varchar(180) NOT NULL,
	"operator_name" varchar(180) NOT NULL,
	"happened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"type" varchar(32) DEFAULT 'normal' NOT NULL,
	"justification" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid,
	"code" varchar(40) NOT NULL,
	"type" "discount_type" NOT NULL,
	"discount_value" integer NOT NULL,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_discount_nonnegative" CHECK ("coupons"."discount_value" >= 0),
	CONSTRAINT "coupons_used_nonnegative" CHECK ("coupons"."used_count" >= 0)
);
CREATE TABLE "event_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text NOT NULL,
	"speaker_name" varchar(140) NOT NULL,
	"speaker_bio" text,
	"speaker_photo_url" text,
	"room" varchar(120),
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "event_form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"label" varchar(120) NOT NULL,
	"description" varchar(300),
	"type" "form_field_type" NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(140) NOT NULL,
	"description" text NOT NULL,
	"summary" varchar(220) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"banner_url" text,
	"modality" "event_modality" NOT NULL,
	"charge_type" "event_charge_type" NOT NULL,
	"status" "event_status" DEFAULT 'rascunho' NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"registration_start_at" timestamp with time zone NOT NULL,
	"registration_end_at" timestamp with time zone NOT NULL,
	"max_capacity" integer NOT NULL,
	"allows_waitlist" boolean DEFAULT false NOT NULL,
	"online_url" text,
	"address_street" varchar(180),
	"address_number" varchar(24),
	"address_complement" varchar(160),
	"address_neighborhood" varchar(120),
	"address_municipality" varchar(100),
	"address_state" varchar(2),
	"responsible_name" varchar(140) NOT NULL,
	"responsible_email" varchar(254) NOT NULL,
	"created_by_global_user_id" varchar(180) NOT NULL,
	"certificate_enabled" boolean DEFAULT false NOT NULL,
	"workload_hours" integer DEFAULT 0 NOT NULL,
	"certificate_description" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_capacity_positive" CHECK ("events"."max_capacity" > 0),
	CONSTRAINT "events_dates_order" CHECK ("events"."end_at" > "events"."start_at" AND "events"."registration_end_at" <= "events"."end_at")
);
CREATE TABLE "outbox_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" varchar(24) NOT NULL,
	"recipient" varchar(254) NOT NULL,
	"subject" varchar(180) NOT NULL,
	"template" varchar(80) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(180) NOT NULL,
	"cpf" varchar(11),
	"passport" varchar(32),
	"email" varchar(254) NOT NULL,
	"phone" varchar(24) NOT NULL,
	"birth_date" timestamp with time zone,
	"company" varchar(180),
	"job_title" varchar(140),
	"terms_consent" boolean DEFAULT false NOT NULL,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "payment_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(24) NOT NULL,
	"provider_event_id" varchar(180) NOT NULL,
	"payment_id" uuid,
	"raw_payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"reference_id" varchar(64) NOT NULL,
	"provider" varchar(24) DEFAULT 'pagbank' NOT NULL,
	"status" "payment_status" DEFAULT 'aguardando' NOT NULL,
	"method" varchar(32),
	"amount_cents" integer NOT NULL,
	"external_id" varchar(180),
	"checkout_url" text,
	"payload" jsonb,
	"paid_at" timestamp with time zone,
	"refunded_cents" integer DEFAULT 0 NOT NULL,
	"refund_reason" text,
	"refunded_at" timestamp with time zone,
	"refunded_by_global_user_id" varchar(180),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_nonnegative" CHECK ("payments"."amount_cents" >= 0 AND "payments"."refunded_cents" >= 0)
);
CREATE TABLE "registration_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"private" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"event_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"lot_id" uuid,
	"coupon_id" uuid,
	"answers_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"original_cents" integer DEFAULT 0 NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"final_cents" integer DEFAULT 0 NOT NULL,
	"status" "registration_status" NOT NULL,
	"reservation_expires_at" timestamp with time zone,
	"waitlist_expires_at" timestamp with time zone,
	"access_token_hash" varchar(128) NOT NULL,
	"credential_token_hash" varchar(128),
	"cancellation_reason" text,
	"confirmed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registrations_money_nonnegative" CHECK ("registrations"."original_cents" >= 0 AND "registrations"."discount_cents" >= 0 AND "registrations"."final_cents" >= 0)
);
CREATE TABLE "ticket_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"price_cents" integer NOT NULL,
	"max_quantity" integer NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_lots_price_positive" CHECK ("ticket_lots"."price_cents" >= 0),
	CONSTRAINT "ticket_lots_quantity_positive" CHECK ("ticket_lots"."max_quantity" > 0)
);
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "event_activities" ADD CONSTRAINT "event_activities_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "event_form_fields" ADD CONSTRAINT "event_form_fields_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "payments" ADD CONSTRAINT "payments_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "registration_files" ADD CONSTRAINT "registration_files_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "registration_files" ADD CONSTRAINT "registration_files_field_id_event_form_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."event_form_fields"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_lot_id_ticket_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."ticket_lots"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "ticket_lots" ADD CONSTRAINT "ticket_lots_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "audit_logs_entity_date_idx" ON "audit_logs" USING btree ("entity","record_id","created_at");
CREATE UNIQUE INDEX "certificates_registration_unique" ON "certificates" USING btree ("registration_id");
CREATE UNIQUE INDEX "certificates_authentication_code_unique" ON "certificates" USING btree ("authentication_code");
CREATE INDEX "checkins_event_date_idx" ON "checkins" USING btree ("event_id","happened_at");
CREATE UNIQUE INDEX "checkins_one_normal_per_registration" ON "checkins" USING btree ("registration_id") WHERE "checkins"."type" = 'normal';
CREATE UNIQUE INDEX "coupons_code_unique" ON "coupons" USING btree ("code");
CREATE INDEX "coupons_event_active_idx" ON "coupons" USING btree ("event_id","active");
CREATE INDEX "event_activities_schedule_idx" ON "event_activities" USING btree ("event_id","start_at");
CREATE INDEX "event_form_fields_order_idx" ON "event_form_fields" USING btree ("event_id","active","display_order");
CREATE UNIQUE INDEX "events_slug_unique" ON "events" USING btree ("slug");
CREATE INDEX "events_public_idx" ON "events" USING btree ("status","registration_start_at","start_at");
CREATE INDEX "events_owner_idx" ON "events" USING btree ("created_by_global_user_id");
CREATE INDEX "outbox_pending_idx" ON "outbox_messages" USING btree ("status","created_at");
CREATE UNIQUE INDEX "participants_email_active_unique" ON "participants" USING btree ("email") WHERE "participants"."deleted_at" IS NULL;
CREATE UNIQUE INDEX "participants_cpf_active_unique" ON "participants" USING btree ("cpf") WHERE "participants"."cpf" IS NOT NULL AND "participants"."deleted_at" IS NULL;
CREATE UNIQUE INDEX "payment_webhook_events_provider_id_unique" ON "payment_webhook_events" USING btree ("provider","provider_event_id");
CREATE UNIQUE INDEX "payments_registration_unique" ON "payments" USING btree ("registration_id");
CREATE UNIQUE INDEX "payments_reference_unique" ON "payments" USING btree ("reference_id");
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");
CREATE INDEX "registration_files_registration_idx" ON "registration_files" USING btree ("registration_id");
CREATE UNIQUE INDEX "registrations_code_unique" ON "registrations" USING btree ("code");
CREATE UNIQUE INDEX "registrations_access_hash_unique" ON "registrations" USING btree ("access_token_hash");
CREATE INDEX "registrations_event_status_idx" ON "registrations" USING btree ("event_id","status","created_at");
CREATE INDEX "registrations_participant_idx" ON "registrations" USING btree ("participant_id","status");
CREATE INDEX "registrations_expiration_idx" ON "registrations" USING btree ("status","reservation_expires_at");
CREATE INDEX "ticket_lots_event_window_idx" ON "ticket_lots" USING btree ("event_id","active","start_at","end_at");

-- Campos de atualização adicionados na migration 0001.
ALTER TABLE "audit_logs" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "certificates" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "checkins" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "payment_webhook_events" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "registration_files" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

COMMIT;
