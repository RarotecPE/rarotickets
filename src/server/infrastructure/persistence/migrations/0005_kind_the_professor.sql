DROP INDEX IF EXISTS "coupons_code_unique";--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "lot_id" uuid;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "allowed_emails" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "allowed_cpfs" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "coupons" c
SET "lot_id" = (
  SELECT tl.id 
  FROM "ticket_lots" tl 
  WHERE tl.event_id = c.event_id 
  ORDER BY tl.sort_order ASC 
  LIMIT 1
)
WHERE c."lot_id" IS NULL;--> statement-breakpoint
DELETE FROM "coupons" WHERE "lot_id" IS NULL;--> statement-breakpoint
ALTER TABLE "coupons" ALTER COLUMN "lot_id" SET NOT NULL;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coupons_lot_id_ticket_lots_id_fk'
  ) THEN
    ALTER TABLE "coupons" ADD CONSTRAINT "coupons_lot_id_ticket_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."ticket_lots"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "coupons_event_code_unique" ON "coupons" USING btree ("event_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupons_lot_id_idx" ON "coupons" USING btree ("lot_id");