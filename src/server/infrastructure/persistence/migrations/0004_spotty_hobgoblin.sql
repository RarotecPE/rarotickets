ALTER TABLE "events" ADD COLUMN "pix_bank_name" varchar(120);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "pix_bank_agency" varchar(32);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "pix_bank_account" varchar(32);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "pix_bank_account_type" varchar(32);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "pix_bank_cnpj" varchar(32);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "pix_bank_account_holder" varchar(180);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "pix_notification_email" varchar(254);