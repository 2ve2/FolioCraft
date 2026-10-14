-- Reviewed integrity guards; data is retained and no table is rewritten or dropped.
ALTER TABLE "releases" ADD CONSTRAINT "releases_site_id_id_unique" UNIQUE ("site_id", "id");
--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "site_published_release_same_site_fk"
 FOREIGN KEY ("id", "published_release_id") REFERENCES "releases" ("site_id", "id")
 DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_id_owner_id_unique" UNIQUE ("id", "owner_id");
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "asset_site_uploader_same_owner_fk"
 FOREIGN KEY ("site_id", "uploader_id") REFERENCES "sites" ("id", "owner_id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE FUNCTION prevent_portfolio_release_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Portfolio releases are immutable' USING ERRCODE = '23514';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER release_snapshot_immutable BEFORE UPDATE ON "releases"
 FOR EACH ROW EXECUTE FUNCTION prevent_portfolio_release_update();
