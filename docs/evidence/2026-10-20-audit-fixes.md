# Audit fixes — 2026-10-20

Source: the read-only architecture/security audit of commit `5fee8f1` (report delivered to the human in chat). The human authorized implementing the fixes on branch `claude/modest-davinci-osg31w` and requested `@paralleldrive/cuid2` for identifiers. The Cloudflare deployment is a friends-only trial on a temporary domain; this work does **not** deploy, touch Neon/R2/Resend, or read secrets.

Verification environment for every step: Bun 1.4.2; local PostgreSQL 16 cluster under ignored `work/pg`, database `folio_test` created with an ICU `en-US` collation to match the CI container's locale behaviour. All integration tests run through the guarded root wrapper (`bun run test`).

## 1. Byte-wise account keysets (commit `5a277eb`)

- Problem: CI run 39401052793 failed `directory keysets traverse equal creation dates…`. The directory ordered mixed-case Better Auth ids with the database collation, while the test (and any client) compares in code-unit order. PostgreSQL ICU `en-US` sorts `aB, Ab, ac`; JavaScript sorts `Ab, aB, ac`.
- Change: `apps/api/src/db/keyset.ts` (`binaryText`, `afterText`), used by the account directory and staff list.
- Evidence: before the change the single test failed 2 of 15 local runs; after it, 0 of 20. Full suite: 57 pass / 12 skip / 0 fail / 3000 assertions; enforced-MFA child 11 / 308.

## 2. cuid2 identifiers

- Change: `packages/contracts/src/ids.ts` (`newId`, `idSchema`); Better Auth `advanced.database.generateId`; Drizzle schema `uuid` → `text` with `$defaultFn(newId)`; reviewed migration `0008_cuid2_text_ids.sql`; all API validators, request ids, audit correlation ids and web content-item ids use the shared helpers; text-id keysets (sites, data requests, reports) order byte-wise.
- Migration proof (one-off local script against a fresh `folio_mig_proof` database): migrated to 0007, inserted a legacy user/site/release/asset/inquiry with UUID ids and a snapshot referencing a UUID asset, applied 0008. Result: `{"identical":true,"allText":true,"types":13,"fks":[6 recreated],"immutableTrigger":true,"sameSiteFk":true,"cascade":true}` — values and JSON are byte-identical, the release immutability trigger and same-site publication FK still reject invalid updates, and account deletion still cascades.
- New tests: `apps/api/tests/identifiers.integration.test.ts` (2000 unique cuid2 ids; legacy UUIDs accepted; malformed ids rejected; new user, session and site ids are cuid2; legacy-UUID and malformed paths return 404). Updated: request-id format assertion and migration count (9).
- Found and fixed during verification: `scripts/backup-db.ts` inserted an `admin_audit` row relying on the removed database default; it now supplies `newId()`.
- Checks: typecheck 0; Biome 364 files 0; web 31 pass; guarded API 59 pass / 12 skip / 0 fail / 5022 assertions; MFA child 11 / 308; `db:verify-restore` restored 12 tables; `test:worker-storage` 6/6; `test:worker-mail` 15/15; `next build` compiled; API Workers dry-run 4644 KiB / 827 KiB gzip; `bun audit` clean.
- Not done: no migration was applied to Neon. Applying 0008 to the trial database is a separate, human-authorized step (`bun run db:migrate` against the trial `DATABASE_URL` after a backup).
