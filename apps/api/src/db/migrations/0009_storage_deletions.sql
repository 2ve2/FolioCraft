CREATE TABLE "storage_deletions" (
	"prefix" text PRIMARY KEY NOT NULL,
	"reason" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storage_deletions_reason" CHECK ("storage_deletions"."reason" in ('account_removed','abandoned_upload')),
	CONSTRAINT "storage_deletions_prefix" CHECK ("storage_deletions"."prefix" ~ '^(staging|verified)/[A-Za-z0-9-]+/')
);
--> statement-breakpoint
CREATE INDEX "storage_deletions_created_idx" ON "storage_deletions" USING btree ("created_at");