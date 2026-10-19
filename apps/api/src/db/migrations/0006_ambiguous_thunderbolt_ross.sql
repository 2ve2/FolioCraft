CREATE TABLE "system_notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"message_ar" text NOT NULL,
	"message_en" text NOT NULL,
	"starts_at" timestamp (3) with time zone NOT NULL,
	"ends_at" timestamp (3) with time zone NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_notices_kind_allowed" CHECK ("system_notices"."kind" in ('info','maintenance','incident')),
	CONSTRAINT "system_notices_window_order" CHECK ("system_notices"."ends_at" > "system_notices"."starts_at"),
	CONSTRAINT "system_notices_message_bounds" CHECK (char_length(btrim("system_notices"."message_ar")) between 1 and 1000 and char_length(btrim("system_notices"."message_en")) between 1 and 1000)
);
--> statement-breakpoint
ALTER TABLE "system_notices" ADD CONSTRAINT "system_notices_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "system_notices_window_idx" ON "system_notices" USING btree ("active","starts_at","ends_at");