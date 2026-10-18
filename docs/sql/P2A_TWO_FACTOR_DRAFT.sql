-- DRAFT P2a: review only. Not registered as a migration. Never applied.
-- Better Auth 1.7.7 two-factor fields; project snake_case SQL mapping.
-- IDs and encrypted factor values are supplied by Better Auth, not SQL defaults.
BEGIN;

ALTER TABLE "user"
    ADD COLUMN "two_factor_enabled" boolean DEFAULT false;

CREATE TABLE "two_factor" (
    "id" text PRIMARY KEY NOT NULL,
    "secret" text NOT NULL,
    "backup_codes" text NOT NULL,
    "user_id" text NOT NULL,
    "verified" boolean DEFAULT true,
    "failed_verification_count" integer DEFAULT 0,
    "locked_until" timestamp,
    CONSTRAINT "two_factor_user_id_user_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE INDEX "two_factor_secret_idx" ON "two_factor" ("secret");
CREATE INDEX "two_factor_user_idx" ON "two_factor" ("user_id");

COMMIT;
