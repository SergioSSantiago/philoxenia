CREATE TABLE IF NOT EXISTS "listing_available_days" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "listing_id" uuid NOT NULL REFERENCES "listings"("id") ON DELETE cascade,
  "day" timestamp with time zone NOT NULL,
  "price_per_night" numeric(78, 18) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "listing_available_days_listing_day_idx"
  ON "listing_available_days" ("listing_id", "day");
--> statement-breakpoint
-- Backfill nights from legacy windows (end exclusive of check-out day)
INSERT INTO "listing_available_days" ("listing_id", "day", "price_per_night")
SELECT
  a."listing_id",
  (d.day + interval '12 hours') AT TIME ZONE 'UTC',
  l."price_per_night"
FROM "listing_availability" a
JOIN "listings" l ON l."id" = a."listing_id"
CROSS JOIN LATERAL generate_series(
  (a."start_date" AT TIME ZONE 'UTC')::date,
  ((a."end_date" AT TIME ZONE 'UTC')::date - 1),
  interval '1 day'
) AS d(day)
ON CONFLICT DO NOTHING;
