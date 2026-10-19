CREATE TABLE "content_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"category" text NOT NULL,
	"message" text NOT NULL,
	"reporter_email" text,
	"reporter_ip_hash" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"handled_by" text,
	"handled_at" timestamp with time zone,
	"resolution_note" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_category_allowed" CHECK ("content_reports"."category" in ('spam','impersonation','illegal','harassment','copyright','other')),
	CONSTRAINT "report_status_allowed" CHECK ("content_reports"."status" in ('open','reviewing','actioned','dismissed')),
	CONSTRAINT "report_message_length" CHECK (char_length("content_reports"."message") between 10 and 1000),
	CONSTRAINT "report_email_length" CHECK ("content_reports"."reporter_email" is null or char_length("content_reports"."reporter_email")<=254),
	CONSTRAINT "report_ip_hash_format" CHECK ("content_reports"."reporter_ip_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "report_resolution_length" CHECK ("content_reports"."resolution_note" is null or char_length("content_reports"."resolution_note") between 10 and 500),
	CONSTRAINT "report_closure_note" CHECK ("content_reports"."status" not in ('actioned','dismissed') or ("content_reports"."resolution_note" is not null and "content_reports"."handled_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_handled_by_user_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reports_status_created_idx" ON "content_reports" USING btree ("status","created_at","id");--> statement-breakpoint
CREATE INDEX "reports_created_idx" ON "content_reports" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "reports_site_idx" ON "content_reports" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "reports_category_created_idx" ON "content_reports" USING btree ("category","created_at","id");