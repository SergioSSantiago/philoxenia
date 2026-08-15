DO $$ BEGIN
 CREATE TYPE "public"."message_kind" AS ENUM('text', 'transfer', 'booking');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "direct_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sender_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "recipient_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "kind" "message_kind" DEFAULT 'text' NOT NULL,
  "body" text NOT NULL,
  "asset" "payment_asset",
  "amount" numeric(78, 18),
  "tx_hash" text,
  "booking_id" uuid REFERENCES "bookings"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "direct_messages_pair_idx" ON "direct_messages" ("sender_id", "recipient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "direct_messages_recipient_idx" ON "direct_messages" ("recipient_id");
