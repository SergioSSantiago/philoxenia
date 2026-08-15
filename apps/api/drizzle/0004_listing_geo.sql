ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "location_lat" numeric(10, 7);
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "location_lng" numeric(10, 7);
