CREATE TABLE "data_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"handled_by" text,
	"notes" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"subject_verified_at" timestamp with time zone,
	"subject_verified_by" text,
	CONSTRAINT "data_request_type" CHECK ("data_requests"."type" in ('export','delete','correction')),
	CONSTRAINT "data_request_status" CHECK ("data_requests"."status" in ('received','in_progress','completed','rejected')),
	CONSTRAINT "data_request_email_length" CHECK (char_length("data_requests"."email") between 3 and 254),
	CONSTRAINT "data_request_notes_length" CHECK ("data_requests"."notes" is null or char_length("data_requests"."notes") between 10 and 500),
	CONSTRAINT "data_request_closure" CHECK ("data_requests"."status" not in ('completed','rejected') or ("data_requests"."notes" is not null and "data_requests"."completed_at" is not null)),
	CONSTRAINT "data_request_subject" CHECK ("data_requests"."user_id" is null or "data_requests"."subject_verified_at" is not null)
);
--> statement-breakpoint
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_handled_by_user_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_subject_verified_by_user_id_fk" FOREIGN KEY ("subject_verified_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "data_requests_due_idx" ON "data_requests" USING btree ("due_at","id");--> statement-breakpoint
CREATE INDEX "data_requests_status_idx" ON "data_requests" USING btree ("status","created_at","id");