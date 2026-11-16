DO $$ BEGIN
  CREATE TYPE "public"."raffle_filter" AS ENUM('todos', 'pagantes', 'presentes', 'manual');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."raffle_prize_status" AS ENUM('pendente', 'sorteando', 'sorteado', 'anulado');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."raffle_status" AS ENUM('rascunho', 'em_andamento', 'concluido', 'cancelado');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "raffles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"title" varchar(150) NOT NULL,
	"description" text,
	"participant_filter" "raffle_filter" DEFAULT 'todos' NOT NULL,
	"allow_repeat_winners" boolean DEFAULT false NOT NULL,
	"animation_duration_seconds" integer DEFAULT 7 NOT NULL,
	"status" "raffle_status" DEFAULT 'rascunho' NOT NULL,
	"public_token" varchar(64) NOT NULL,
	"current_prize_id" uuid,
	"show_winners_summary" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "raffle_prizes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raffle_id" uuid NOT NULL,
	"title" varchar(150) NOT NULL,
	"description" text,
	"order_index" integer NOT NULL,
	"status" "raffle_prize_status" DEFAULT 'pendente' NOT NULL,
	"winner_registration_id" uuid,
	"winner_participant_id" uuid,
	"winner_name" varchar(255),
	"winner_ticket_code" varchar(50),
	"drawn_at" timestamp with time zone,
	"disqualification_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "raffle_manual_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raffle_id" uuid NOT NULL,
	"registration_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "raffle_draw_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raffle_id" uuid NOT NULL,
	"prize_id" uuid NOT NULL,
	"winner_registration_id" uuid,
	"winner_name" varchar(255) NOT NULL,
	"winner_ticket_code" varchar(50),
	"action" varchar(50) NOT NULL,
	"reason" text,
	"drawn_by_user_id" varchar(128),
	"drawn_by_user_name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'raffles_event_id_events_id_fk') THEN
    ALTER TABLE "raffles" ADD CONSTRAINT "raffles_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'raffle_prizes_raffle_id_raffles_id_fk') THEN
    ALTER TABLE "raffle_prizes" ADD CONSTRAINT "raffle_prizes_raffle_id_raffles_id_fk" FOREIGN KEY ("raffle_id") REFERENCES "public"."raffles"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'raffle_prizes_winner_registration_id_registrations_id_fk') THEN
    ALTER TABLE "raffle_prizes" ADD CONSTRAINT "raffle_prizes_winner_registration_id_registrations_id_fk" FOREIGN KEY ("winner_registration_id") REFERENCES "public"."registrations"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'raffle_prizes_winner_participant_id_participants_id_fk') THEN
    ALTER TABLE "raffle_prizes" ADD CONSTRAINT "raffle_prizes_winner_participant_id_participants_id_fk" FOREIGN KEY ("winner_participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'raffle_manual_participants_raffle_id_raffles_id_fk') THEN
    ALTER TABLE "raffle_manual_participants" ADD CONSTRAINT "raffle_manual_participants_raffle_id_raffles_id_fk" FOREIGN KEY ("raffle_id") REFERENCES "public"."raffles"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'raffle_manual_participants_registration_id_registrations_id_fk') THEN
    ALTER TABLE "raffle_manual_participants" ADD CONSTRAINT "raffle_manual_participants_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'raffle_draw_history_raffle_id_raffles_id_fk') THEN
    ALTER TABLE "raffle_draw_history" ADD CONSTRAINT "raffle_draw_history_raffle_id_raffles_id_fk" FOREIGN KEY ("raffle_id") REFERENCES "public"."raffles"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'raffle_draw_history_prize_id_raffle_prizes_id_fk') THEN
    ALTER TABLE "raffle_draw_history" ADD CONSTRAINT "raffle_draw_history_prize_id_raffle_prizes_id_fk" FOREIGN KEY ("prize_id") REFERENCES "public"."raffle_prizes"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'raffle_draw_history_winner_registration_id_registrations_id_fk') THEN
    ALTER TABLE "raffle_draw_history" ADD CONSTRAINT "raffle_draw_history_winner_registration_id_registrations_id_fk" FOREIGN KEY ("winner_registration_id") REFERENCES "public"."registrations"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "raffles_public_token_unique" ON "raffles" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "raffles_event_id_idx" ON "raffles" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "raffle_prizes_raffle_id_order_idx" ON "raffle_prizes" USING btree ("raffle_id","order_index");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "raffle_manual_participants_unique" ON "raffle_manual_participants" USING btree ("raffle_id","registration_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "raffle_draw_history_raffle_idx" ON "raffle_draw_history" USING btree ("raffle_id","created_at");
