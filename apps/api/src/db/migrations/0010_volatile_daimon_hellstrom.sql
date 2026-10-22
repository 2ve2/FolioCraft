CREATE TABLE "cache_invalidations" (
	"site_id" text NOT NULL,
	"slug" text NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"delivered_version" bigint DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cache_invalidations_site_id_slug_pk" PRIMARY KEY("site_id","slug"),
	CONSTRAINT "cache_invalidations_versions" CHECK ("cache_invalidations"."version" > 0 and "cache_invalidations"."delivered_version" >= 0 and "cache_invalidations"."delivered_version" <= "cache_invalidations"."version")
);
--> statement-breakpoint
CREATE INDEX "cache_invalidations_pending_idx" ON "cache_invalidations" USING btree ("updated_at") WHERE "cache_invalidations"."delivered_version" < "cache_invalidations"."version";
--> statement-breakpoint
-- Additive outbox only. No existing content/auth row or reference is rewritten or removed.
-- Keep acknowledged generations as tombstones to prevent ABA races between concurrent deliveries.
CREATE FUNCTION ichnara_enqueue_invalidation(target_id text, target_slug text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO cache_invalidations (site_id, slug) VALUES (target_id, target_slug)
  ON CONFLICT (site_id, slug) DO UPDATE
    SET version = cache_invalidations.version + 1, updated_at = clock_timestamp();
END;
$$;
--> statement-breakpoint
CREATE FUNCTION ichnara_site_invalidation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM ichnara_enqueue_invalidation(OLD.id, OLD.slug);
    RETURN OLD;
  END IF;
  IF OLD.published_release_id IS DISTINCT FROM NEW.published_release_id
     OR OLD.suspended IS DISTINCT FROM NEW.suspended
     OR OLD.slug IS DISTINCT FROM NEW.slug THEN
    PERFORM ichnara_enqueue_invalidation(OLD.id, OLD.slug);
    IF OLD.slug IS DISTINCT FROM NEW.slug THEN
      PERFORM ichnara_enqueue_invalidation(NEW.id, NEW.slug);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER ichnara_site_invalidation AFTER UPDATE OR DELETE ON sites
FOR EACH ROW EXECUTE FUNCTION ichnara_site_invalidation();
--> statement-breakpoint
CREATE FUNCTION ichnara_owner_invalidation() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE target record;
BEGIN
  IF OLD.banned IS DISTINCT FROM NEW.banned OR OLD.ban_expires IS DISTINCT FROM NEW.ban_expires THEN
    FOR target IN SELECT id, slug FROM sites WHERE owner_id = NEW.id LOOP
      PERFORM ichnara_enqueue_invalidation(target.id, target.slug);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER ichnara_owner_invalidation AFTER UPDATE OF banned, ban_expires ON "user"
FOR EACH ROW EXECUTE FUNCTION ichnara_owner_invalidation();
--> statement-breakpoint
CREATE FUNCTION ichnara_asset_invalidation() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE target record;
BEGIN
  IF TG_OP = 'DELETE' OR (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('deleting', 'deleted')) THEN
    SELECT id, slug INTO target FROM sites WHERE id = OLD.site_id;
    IF FOUND THEN PERFORM ichnara_enqueue_invalidation(target.id, target.slug); END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER ichnara_asset_invalidation AFTER UPDATE OR DELETE ON assets
FOR EACH ROW EXECUTE FUNCTION ichnara_asset_invalidation();
