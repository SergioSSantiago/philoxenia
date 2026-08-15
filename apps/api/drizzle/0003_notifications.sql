CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "href" text,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_unread_idx" ON "notifications" ("user_id", "read_at");
