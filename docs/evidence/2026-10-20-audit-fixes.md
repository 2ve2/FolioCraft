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

## 3. Web security headers

- Problem: the Next.js web app sent no CSP, framing or HSTS headers (no `headers()` or proxy), so `/studio` could be framed for clickjacking.
- Change: `apps/web/src/lib/security-headers.ts` applied to every route from `next.config.ts`, following the Next 16 "without nonces" CSP guide (nonces would force all static pages to render per request). Policy: `default-src 'self'`; scripts/styles `'self' 'unsafe-inline'` (Next hydration and React inline styles); images and `connect-src` limited to the app, the API origin and `*.r2.cloudflarestorage.com` (presigned uploads/previews); `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`; plus `X-Frame-Options: DENY`, `nosniff`, `strict-origin-when-cross-origin`, a restrictive `Permissions-Policy` and `COOP: same-origin`. `upgrade-insecure-requests` and HSTS (`max-age=31536000`, no `includeSubDomains` because the trial apex hosts unrelated subdomains) apply only when `NEXT_PUBLIC_WEB_URL` is HTTPS; `'unsafe-eval'`/`ws:` only in development.
- Tests: `apps/web/tests/security-headers.test.ts` (2 cases). Web suite 33 pass.
- Browser evidence (local production build `next start` + Bun API on `folio_test`, Chromium 1194, fictional seeded account and published Arabic portfolio): `/`, `/login`, `/signup`, `/forgot-password`, `/studio`, `/p/<slug>`, `/p/<slug>/projects/<id>` all returned 200 with the CSP and `X-Frame-Options: DENY`, **0 CSP violations and 0 console errors**; the authenticated studio rendered the seeded workspace; a cross-origin page embedding `/studio` in an iframe was refused by the browser.
- Not verified: presigned R2 upload/preview under the CSP against real R2 (no provider access in this environment) — the R2 wildcard is in `img-src` and `connect-src` for that path.

## 4. Server-rendered language and direction for published portfolios

- Problem: the single root layout hard-coded `<html lang="en" dir="ltr">`; Arabic portfolios set `dir` only on an inner element, so screen readers and search engines saw English/LTR documents.
- Change: two root layouts via route groups. `(platform)` keeps the existing layout for landing, auth, studio and admin; `(portfolio)/p/[slug]/layout.tsx` renders `<html lang dir>` from the published release locale. `_public.tsx` wraps the public read in React `cache()`, so layout, `generateMetadata` and page share one API request. `global-not-found.tsx` (Next 16 `experimental.globalNotFound`, the documented approach for multiple root layouts) keeps the branded 404 for unmatched URLs. Shared font/CSS imports live in `root-styles.ts`. Files moved with `git mv`; relative imports were rewritten mechanically and type-checked.
- Evidence (local `next start` + Bun API on `folio_test`, fictional Arabic and English portfolios): Arabic `/p/<slug>` returns `<html lang="ar" dir="rtl">`, English returns `lang="en" dir="ltr"`; one API request per portfolio page view (was two: metadata and page); `/p/does-not-exist`, `/nope`, `/admin/nope`, `/studio/nope` all return 404 with the branded page in Chromium.
- Deployed-runtime evidence: `bun run --cwd apps/web build:cloudflare` (OpenNext) succeeded and `wrangler dev` (local workerd) served `/`, `/login`, `/studio` 200, `/nope` 404, the Arabic portfolio with `lang="ar" dir="rtl"`, the missing portfolio 404, and the CSP/X-Frame-Options headers.
- Checks: typecheck 0; Biome 369 files 0; web 33 pass.
- Note: moving between `/p/*` and platform routes is a full page load (different root layouts); the only such link is the "Visit Ichnara" badge, already a plain anchor.

## 5. Visible keyboard focus

- Problem: form fields removed the outline and showed only an ~8%-opacity shadow; the shared button/link/select focus colour `#a890e8` measured 2.69:1 on white, below the WCAG 2.2 3:1 non-text contrast minimum.
- Change: `--focus-ring: #7c5cd6` in `styles/tokens.css` (4.82:1 on white, 4.45:1 on `#f7f5fb`); fields get a 2px `:focus-visible` outline, buttons/links/select trigger and focused options use the token. Mouse focus styling is unchanged.
- Evidence (Chromium, local production build, `/login`): tabbing reports `outline: solid 2px rgb(124, 92, 214)` on the password field and `3px` on the submit button and links; screenshot reviewed.

## 6. Owner-supplied outbound links

- Problem: public portfolio links to owner-supplied URLs carried `noopener noreferrer` but not `ugc nofollow`, inviting link-spam signups on the platform domain. Audit correction: the audit also flagged `website` as bypassing `safeHttpUrl`; `portfolio.tsx` already sanitizes it before passing it down, so that part was defence-in-depth only.
- Change: `packages/portfolio/src/external-link.tsx` renders every owner link (website, social links, project links, education verification) with HTTP(S)-only `href`, `target="_blank"` and `rel="ugc nofollow noopener noreferrer"`, returning nothing for unsafe targets. Five hand-written anchors replaced.
- Tests: `apps/web/tests/portfolio-links.test.tsx` (all new-tab anchors carry the rel; `javascript:`/`data:` targets never render). Web 34 pass; guarded API 59 pass / 0 fail.

## 7. Server-error status when a published release cannot be read

- Problem: when the API was unreachable, public portfolio pages rendered "Portfolio unavailable" with HTTP 200, invisible to uptime checks and indexable as content.
- Change: pages call `releaseUnavailable()`, which throws during render; `(portfolio)/p/[slug]/error.tsx` shows the same bilingual message plus a retry button. A release switch between the site and detail reads is treated the same way.
- Evidence (local production build, API stopped): `/p/<slug>` and `/p/<slug>/projects/<id>` return **500** with `<meta name="robots" content="noindex">`, and Chromium renders the bilingual message; with the API running the same URL returns 200.
- Limit: Next.js page rendering cannot choose 503 specifically; 500 is the achievable server-error status without an extra proxy layer. The audit's "503" recommendation is therefore met as "5xx + noindex".

## 8. CI builds what is deployed

- Problem: CI ran `next build` (Turbopack) while deployment uses OpenNext with webpack, and never ran the Workers-runtime regressions, the API Worker bundle or `bun audit`; `actions/checkout@v4` triggered the Node 20 deprecation warning.
- Change (`.github/workflows/check.yml`): new `workers` job (`test:worker-storage`, `test:worker-mail`, API `wrangler deploy --dry-run`, `build:cloudflare`); `bun audit` in `validate`; `actions/checkout@v5`; read-only `permissions`; `concurrency` cancels superseded runs. Integration job unchanged (PostgreSQL 18 service).
- Local evidence for every new step: audit clean (498 packages); storage 6/6; mail 15/15; API dry-run 4644 KiB / 827 KiB gzip; OpenNext build exit 0 with default (unset) public URLs. Remote GitHub Actions execution of the new job is not yet observed (push access pending).

## 9. Draft legal pages

- Problem: no privacy notice, terms or content policy, while the product stores account, session (IP/user agent), visitor-message and report data.
- Change: `/privacy`, `/terms`, `/content-policy` (Arabic and English) from `features/legal/legal-copy.ts`, rendered by `features/legal/legal-page.tsx`; linked from the shared product footer (new "Legal" column) and from an agreement line on the signup form. Every page shows a visible **draft** notice and the draft date.
- Content was written from the code, not assumptions: password hashing, session IP/user agent, drafts and all published versions, uploaded images, visitor messages, reports with a salted IP hash (never the raw IP), hashed rate-limit counters, staff audit log; only essential auth cookies and no analytics/trackers/browser storage (verified: no `localStorage`/`sessionStorage`/analytics in the web source); providers Cloudflare, Neon and Resend. Unknowns are stated as unknowns: retention periods, official contact channel and governing law are "to be defined before the public launch".
- Evidence (Chromium, local production build): all three pages plus `/signup` return 200 at 1280 px and 390 px in Arabic and English, correct `dir`, no horizontal overflow, no console errors, three legal links in the footer; screenshots reviewed (consent links underlined; Arabic date rendered LTR).
- Owner action: legal review of the wording, a contact address, retention periods and governing law before public launch.

## 10. Single-language authentication emails

- Problem: verification and reset emails mixed English and Arabic in one subject/body, with no `lang`/`dir`, and the sender had no display name.
- Change: `apps/api/src/lib/auth/mail-templates.ts` builds Arabic or English subject, text and HTML (`<html lang dir>`, accessible button, plain-link fallback, escaped account name). The language comes from the `lang` the web app already puts in the native link's `callbackURL`; anything else falls back to English. Sender is `Ichnara <MAIL_FROM>`. Link-origin validation, redaction, timeouts and native anti-enumeration behaviour are unchanged.
- Tests: `apps/api/tests/mail-templates.test.ts` (locale detection incl. fallbacks; Arabic RTL/English LTR; no mixed language; HTML escaping). `test:worker-mail` 15/15 (sender assertion updated). Both templates rendered in Chromium and reviewed.
- Not verified: real mailbox rendering in Gmail/Outlook and inbox placement (no provider access); the display name may improve recognition but deliverability still depends on the domain's SPF/DKIM/DMARC records.

## 11. Release retention

- Problem: every publish stored a full immutable snapshot (up to ~1 MB) with no limit, so storage grew without bound and could be exhausted deliberately.
- Change: `RELEASE_RETENTION = 50` in `services/sites/release-service.ts`; after a new release becomes active, older releases beyond the newest 50 are deleted in the same transaction. Re-publishing an existing revision reuses its release and prunes nothing. Rollback to any of the 50 retained releases keeps working.
- Test: `apps/api/tests/release-retention.integration.test.ts` (55 seeded + 1 published → exactly 50 kept; new release active; the six oldest removed; idempotent re-publish).

## 12. Scheduled maintenance and R2 cleanup after account removal

- Problem: `rateLimitService.cleanup()` existed but was never called; expired sessions, verification rows, Better Auth rate-limit rows and abandoned uploads accumulated; removing an account cascaded database rows but left its R2 objects forever.
- Change: migration `0009_storage_deletions.sql` (queue of R2 prefixes with a CHECK that only allows `staging/<id>/…`/`verified/<id>/…`); `services/maintenance.ts` (bounded jobs, injectable storage for tests); `storage.listKeys`; API Worker `scheduled` handler with a daily Cron Trigger; `bun run --cwd apps/api maintenance`; account removal queues the removed sites' prefixes after the native removal succeeds (keys are collected first; a queue failure is logged because the account is already gone).
- Tests: `apps/api/tests/maintenance.integration.test.ts` (only expired rows removed, live session kept; abandoned upload retired while fresh pending and ready assets stay; queued objects deleted, unrelated keys kept; provider failure keeps the prefix with `attempts = 1`; storage disabled still runs DB jobs; dangerous prefixes rejected by the database). The account-removal test now asserts both prefixes are queued. `admin-operations` derives the expected migration count from the Drizzle journal instead of a hard-coded number. `test:worker-storage` gained two `ListObjectsV2` cases (8/8, no DOMParser).
- Workers runtime evidence: `wrangler dev --test-scheduled` against local `folio_test`; `GET /__scheduled` logged `{"event":"maintenance_completed",…,"storage":"disabled"}` from workerd.
- Full suite: 65 pass / 12 skip / 0 fail / 5137 assertions; MFA child 11/308.
- Separate observation (pre-existing, not changed here): in local `wrangler dev`, a `/ready` request logs `{"event":"database_pool_error","name":"TypeError"}` while still returning 200; the original commit `5fee8f1` logs the same line. Worth investigating with Workers logs after deployment.
