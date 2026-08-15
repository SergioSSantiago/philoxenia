ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "selected_nights" text[] DEFAULT '{}' NOT NULL;
--> statement-breakpoint
-- Backfill contiguous nights from check_in / check_out for existing rows
UPDATE "bookings" b
SET "selected_nights" = COALESCE(
  (
    SELECT array_agg(to_char(d.day, 'YYYY-MM-DD') ORDER BY d.day)
    FROM generate_series(
      (b."check_in" AT TIME ZONE 'UTC')::date,
      ((b."check_out" AT TIME ZONE 'UTC')::date - 1),
      interval '1 day'
    ) AS d(day)
  ),
  '{}'
)
WHERE cardinality(b."selected_nights") = 0;
