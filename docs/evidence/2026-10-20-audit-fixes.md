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
