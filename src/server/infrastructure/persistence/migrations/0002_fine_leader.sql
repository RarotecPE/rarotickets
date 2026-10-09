CREATE TABLE "participant_auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid,
	"type" varchar(32) NOT NULL,
	"email" varchar(254) NOT NULL,
	"cpf" varchar(11),
	"token_hash" varchar(128) NOT NULL,
	"code" varchar(12),
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "status" varchar(32) DEFAULT 'ativo' NOT NULL;--> statement-breakpoint
ALTER TABLE "participant_auth_tokens" ADD CONSTRAINT "participant_auth_tokens_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "participant_auth_tokens_hash_unique" ON "participant_auth_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "participant_auth_tokens_lookup_idx" ON "participant_auth_tokens" USING btree ("type","email","expires_at");