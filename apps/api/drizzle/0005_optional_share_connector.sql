ALTER TABLE "listing_shares" ALTER COLUMN "connector_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "share_introductions" ALTER COLUMN "connector_id" DROP NOT NULL;
--> statement-breakpoint
-- Host must never be stored as connector on shares created before this change
UPDATE "listing_shares" SET "connector_id" = NULL WHERE "connector_id" = "host_id";
--> statement-breakpoint
UPDATE "share_introductions" SET "connector_id" = NULL WHERE "connector_id" = "host_id";
