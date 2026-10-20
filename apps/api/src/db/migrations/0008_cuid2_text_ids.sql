-- Reviewed: domain identifiers become text so new rows use cuid2 (human-confirmed 2026-10-20).
-- Existing UUID values are kept verbatim in their canonical text form; no row, release
-- snapshot or draft is deleted or rewritten beyond the column type change. New ids come
-- from the application (newId), so the database UUID defaults are removed.
-- Foreign keys spanning converted columns are dropped and recreated with identical
-- definitions so both sides change type together inside the migration transaction.
ALTER TABLE "sites" DROP CONSTRAINT "site_published_release_same_site_fk";--> statement-breakpoint
ALTER TABLE "assets" DROP CONSTRAINT "asset_site_uploader_same_owner_fk";--> statement-breakpoint
ALTER TABLE "assets" DROP CONSTRAINT "assets_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "inquiries" DROP CONSTRAINT "inquiries_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "content_reports" DROP CONSTRAINT "content_reports_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "releases" DROP CONSTRAINT "releases_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "sites"
 ALTER COLUMN "id" DROP DEFAULT,
 ALTER COLUMN "id" SET DATA TYPE text USING "id"::text,
 ALTER COLUMN "published_release_id" SET DATA TYPE text USING "published_release_id"::text;--> statement-breakpoint
ALTER TABLE "releases"
 ALTER COLUMN "id" DROP DEFAULT,
 ALTER COLUMN "id" SET DATA TYPE text USING "id"::text,
 ALTER COLUMN "site_id" SET DATA TYPE text USING "site_id"::text;--> statement-breakpoint
ALTER TABLE "assets"
 ALTER COLUMN "id" DROP DEFAULT,
 ALTER COLUMN "id" SET DATA TYPE text USING "id"::text,
 ALTER COLUMN "site_id" SET DATA TYPE text USING "site_id"::text;--> statement-breakpoint
ALTER TABLE "inquiries"
 ALTER COLUMN "id" DROP DEFAULT,
 ALTER COLUMN "id" SET DATA TYPE text USING "id"::text,
 ALTER COLUMN "site_id" SET DATA TYPE text USING "site_id"::text;--> statement-breakpoint
ALTER TABLE "content_reports"
 ALTER COLUMN "id" DROP DEFAULT,
 ALTER COLUMN "id" SET DATA TYPE text USING "id"::text,
 ALTER COLUMN "site_id" SET DATA TYPE text USING "site_id"::text;--> statement-breakpoint
ALTER TABLE "admin_audit"
 ALTER COLUMN "id" DROP DEFAULT,
 ALTER COLUMN "id" SET DATA TYPE text USING "id"::text;--> statement-breakpoint
ALTER TABLE "data_requests"
 ALTER COLUMN "id" DROP DEFAULT,
 ALTER COLUMN "id" SET DATA TYPE text USING "id"::text;--> statement-breakpoint
ALTER TABLE "system_notices"
 ALTER COLUMN "id" DROP DEFAULT,
 ALTER COLUMN "id" SET DATA TYPE text USING "id"::text;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_site_id_sites_id_fk"
 FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_site_id_sites_id_fk"
 FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_site_id_sites_id_fk"
 FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_site_id_sites_id_fk"
 FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "asset_site_uploader_same_owner_fk"
 FOREIGN KEY ("site_id", "uploader_id") REFERENCES "sites" ("id", "owner_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "site_published_release_same_site_fk"
 FOREIGN KEY ("id", "published_release_id") REFERENCES "releases" ("site_id", "id")
 DEFERRABLE INITIALLY DEFERRED;
