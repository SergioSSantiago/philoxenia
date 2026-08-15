-- Optional connector + protocol fee on connector reward
ALTER TABLE "bookings" ALTER COLUMN "connector_id" DROP NOT NULL;

ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_connector_id_users_id_fk";

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_connector_id_users_id_fk"
  FOREIGN KEY ("connector_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "protocol_fee_amount" numeric(78, 18) DEFAULT '0' NOT NULL;

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "protocol_fee_percent" integer DEFAULT 0 NOT NULL;
