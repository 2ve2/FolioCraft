# Current status

## Latest completed work — deterministic browser E2E, 2026-10-21
- Branch codex/playwright-e2e starts from freshly fetched main ba37ac6. [PR4](https://github.com/2ve2/FolioCraft/pull/4) is open and unmerged. Application runtime, security settings and schema are unchanged.
- Implemented43 Chromium checks against real Bun/Hono, guarded local folio_test and production Next build/start: bilingual routing/auth/studio, serialized save before locale change, public/draft isolation, unpublish, ownership/admin denials, script checks with negative controls and harness safety. [Setup/limits](E2E.md).
- Final clean install:398 packages, all eleven gates pass; Biome403 files, web37/0/685 assertions, API66/12 unchanged conditional skips/0/5143 plus native MFA child11/0/308, storage8/8, mail15/15, Next49/49, OpenNext/API dry run exit0. Final clean E2E43/43 passed three consecutive times (26.9s,30.6s,28.5s). Fourteen tested implementation/configuration files match the commit checkout byte-for-byte.
- Actual remote acceptance on69da0f1: [run39624159815](https://github.com/2ve2/FolioCraft/actions/runs/39624159815) completed successfully for validate, workers, integration and e2e. The browser job reports43 passed (41.1s); full job approximately2m08s. Earlier clean-install import defects were corrected and their failed run is retained in the evidence. The final follow-up commit changes documentation only.
- Cleanup verified:0 generated E2E accounts remain; owned API/web and both disposable PostgreSQL servers stopped; ports4300/4400/55432/55433 closed. Pre-existing untracked docs/ADMIN_CONSOLE_TASK.md preserved.
- Active source work:none. Blockers:none for this scope. Next action: human reviews/merges PR4. Required provisioning/new secrets/production migration/deployment:none. [Full evidence](evidence/2026-10-21-playwright-e2e.md).
- Not verified: real email/R2/image uploads, hosted cookies/persistence, staff MFA through Playwright and other browser/device engines. Existing deployed-trial limits below remain open.

Updated: 2026-10-21, Asia/Riyadh. This page is the short continuation point. Older detail is in [STATUS-ARCHIVE.md](STATUS-ARCHIVE.md); step evidence is in [evidence/2026-10-20-audit-fixes.md](evidence/2026-10-20-audit-fixes.md) and [evidence/2026-10-20-locale-routing.md](evidence/2026-10-20-locale-routing.md).

## Deployed friends-only trial

- https://lord2ve.tech (web) and https://api.lord2ve.tech (API), temporary domain; the platform name Ichnara is confirmed.
- The audit fixes (PR 2ve2/FolioCraft#1) are merged into `main`. The human reported running the database migrations and deploying from the independent checkout; the new Worker version ids were not recorded in this session and hosted behaviour was not verified from here (network policy).
- Known hosted limits: mailbox delivery of the new email templates is unconfirmed; MFA and upload are not acceptance-tested; signup skips email verification by human instruction; no staging, monitoring or scheduled backups.

## Latest work: language path prefixes (branch `claude/modest-davinci-osg31w`, not deployed)

- Root fix for the "refresh on every page change" report: platform pages are served under `/ar/...` and `/en/...`, prerendered with final text and direction, so no page shows a loading screen to restore its language. Old `?lang=` links redirect to the matching prefix and keep their tokens.
- No page mixes Arabic and English any more: single-language portfolio error page, localized browser-tab titles, 404 pages in the URL's language, Arabic-only logo label, real `/p/<slug>` in the studio preview bar.
- Emails read their language from the callback path prefix.

## Previous locale-routing verification (local)

Typecheck exit 0; Biome 392 files, 0 issues; web 37 pass / 0 fail / 685 assertions; guarded API 66 pass / 12 skip / 0 fail / 5143 assertions; Workers storage 8/8; Workers mail 15/15; `next build` and OpenNext build exit 0; redirects, Arabic server HTML and titles verified in local workerd; Chromium navigation shows zero loading screens on page changes and language switches. Details and known limits in the locale-routing evidence file.

## Blockers

- None for the E2E scope. Hosted verification remains a separate authorized activity.

## Next actions

1. Human: review and merge PR4. This test-only change requires no deployment or production migration.
2. Human: send one password-reset email to a private mailbox to confirm delivery and the new single-language template.
3. Human: decide the legal page contact address, retention periods and governing law; then set `TRIAL_SKIP_EMAIL_VERIFICATION=false` once mail delivery is confirmed.
4. Engineering backlog not started: error tracking/uptime alerts, Hyperdrive, public response caching, a staging environment, platform color tokens, and the logged `database_pool_error` investigation.
