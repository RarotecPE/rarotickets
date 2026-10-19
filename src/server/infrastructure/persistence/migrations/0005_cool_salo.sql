ALTER TABLE "audit_logs" ADD COLUMN "forwarded_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "audit_logs_forwarded_idx" ON "audit_logs" USING btree ("forwarded_at");