ALTER TABLE "events" ADD COLUMN "payment_mode" varchar(32) DEFAULT 'pagbank' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "pix_code" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "pix_qr_code_url" text;