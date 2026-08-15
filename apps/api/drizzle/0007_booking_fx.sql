ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "total_price_dai" numeric(78, 18);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "fx_rate" numeric(78, 18);
