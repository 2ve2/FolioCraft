# Current status

## Latest work — platform color tokens, 2026-10-22
- Branch `codex/platform-color-tokens` starts from freshly fetched main `8b49fe2`. Exact extraction implemented across platform styles and one decorative admin icon; public portfolio code and owner appearance remain unchanged. No dependency/schema/provider/deployment changes.
- Baseline: all11 required gates exit0. Real local Chromium captures:48 before/48 after, Arabic/English,390/768/1440, landing/login/signup/privacy/terms/404/seeded Studio/native-MFA admin overview; every pair has0 changed decoded pixels and no page errors. The exact fixture was removed with0 users remaining. Expansion comparison matches29 original stylesheets.
- Entry committed as `6bcd8e8`; workspace state also passed all11 gates (Biome429, web37/0, API81/12 unchanged skips/0, native MFA11/0, database14/14, storage8/8, mail15/15, both builds50/50 and dry run exit0).
- Workspace committed as `3939be4`. Administration/final candidate also passed all11 gates: Biome429, web37/0/685, API81/12 unchanged skips/0/5311, native MFA11/0/308, workerd database14/14, storage8/8, mail15/15, both builds50/50 and dry run exit0. Baseline plus three group states:44/44 command executions exit0.
- Active: commit administration, push the branch and open an unmerged PR; record final cleanup and remote status. No local blockers. Next action: GitHub delivery. Evidence: `docs/evidence/2026-10-22-platform-color-tokens.md` and adjacent JSON. No hosted acceptance is claimed.


## Latest work — optional Hyperdrive latency, 2026-10-22
- Branch `codex/hyperdrive-latency` starts at fetched main `3f85e37`. Optional Worker HTTP/Cron binding selection, bounded-origin deadline guard and opt-in numeric connection/query timings are implemented; existing Bun/unbound configuration and publication transactions remain. No active binding, caching, deployment, dependency or schema change.
- Local baseline public/session/studio medians5.87/7.21/6.79ms; after-unbound7.08/9.71/8.55ms; local binding6.95/9.89/7.85ms. Native local binding forwards directly to PostgreSQL and cannot establish real Hyperdrive gains. Prepare only the inactive candidate; trial activation must earn retention with measurements. Service Binding local median6ms for both paths; production web routing is unchanged.
- All eleven implementation gates plus monitoring pass: API79/12 unchanged conditional skips/0/5297 assertions; MFA11/0/308; web37/0/685; workerd database14/14; storage8/8; mail15/15; monitoring28/28; Biome425; Next/OpenNext50/50; API dry run5134.08KiB/gzip939.14KiB. No hosted checks/provider operations/browser UI acceptance. [Full evidence](evidence/2026-10-22-hyperdrive-latency.md).
- Implementation committed in `ae1749f`; password-authenticated CI harness correction in `194d189`. [PR7](https://github.com/2ve2/FolioCraft/pull/7) is open and unmerged. [Manual runbook](HYPERDRIVE.md) includes safe stdin provisioning, origin deadline preservation/restoration, code-first/binding-second deployment, public timing, safe tail and per-step rollback. Final acceptance14/14 commands exit0 against local SCRAM, including all eleven gates and both benchmarks. Corrected remote CI run39709019010 succeeds for validate/workers/integration/e2e, with Chromium43 passed on194d189. Active source work:none; local blockers:none. Next action:human review and optional measured trial procedure; actual edge improvement/configuration acceptance remains unverified. Cleanup:0 latency accounts,0 residual role/database deadline overrides, owned PostgreSQL stopped and55434 closed. Final documentation-only commit checks are not preclaimed. Unrelated untracked docs/ADMIN_CONSOLE_TASK.md is preserved.

## Latest completed work — owner monitoring, 2026-10-22
- The human selected Sentry Developer + UptimeRobot Free. Staging is cancelled; no staging resources or changes are part of this branch. Branch `codex/owner-monitoring` starts at fetched main `97bfd30`.
- Implemented optional server-only API/OpenNext capture, actual Worker-version tags, strict outgoing privacy allowlist, handled 5xx/unhandled/Cron failure capture, HEAD/OPTIONS coverage, web liveness and bilingual privacy updates retaining the draft notice. DSN is a Worker secret only; absent/invalid DSN or version disables capture. No browser SDK/CSP change.
- Final local acceptance repeated before the documentation commit: all15 commands exit0; API75 pass/12 existing conditional skips/0 fail/5264 assertions plus MFA11/0/308, web37/0/685, Biome419, storage8/8, mail15/15, Next/OpenNext50/50 and both dry runs exit0. Workerd28/28, database runtime7/7, Chromium43/43 (36.1s). Actual built web /health and /en make zero API/database requests; one deliberate render failure yields one scrubbed event. Source/config parity491 files, zero mismatches.
- Implementation committed as `2f69306` (`feat(monitoring): capture private server errors`); operational documentation is a separate completed step. [PR5](https://github.com/2ve2/FolioCraft/pull/5) is open and unmerged. Final bundles: API5130.08 KiB/gzip938.15; web9695.11 KiB/gzip1996.48, approximately14.8% of the current official64MiB raw Free limit. No deployment, hosted database/provider operation, account/secret creation or live alert acceptance.
- Temporary approval-service quota blocker resolved after the human requested continuation. Cleanup:0 generated E2E accounts remain; owned PostgreSQL stopped; local ports4300/4400/55432 closed. No reset or hosted database access occurred. Unrelated untracked docs/ADMIN_CONSOLE_TASK.md is preserved and excluded.
- Active source work:none. Local blockers:none. Remote PR checks are running and are not claimed successful. Next action: human review/merge, then the explicit [setup/release checklist](MONITORING.md). [Comparison and evidence](evidence/2026-10-21-owner-monitoring.md).

## Latest completed work — deterministic browser E2E, 2026-10-21
- Branch codex/playwright-e2e starts from freshly fetched main ba37ac6. [PR4](https://github.com/2ve2/FolioCraft/pull/4) is open and unmerged. Application runtime, security settings and schema are unchanged.
- Implemented43 Chromium checks against real Bun/Hono, guarded local folio_test and production Next build/start: bilingual routing/auth/studio, serialized save before locale change, public/draft isolation, unpublish, ownership/admin denials, script checks with negative controls and harness safety. [Setup/limits](E2E.md).
- Final clean install:398 packages, all eleven gates pass; Biome403 files, web37/0/685 assertions, API66/12 unchanged conditional skips/0/5143 plus native MFA child11/0/308, storage8/8, mail15/15, Next49/49, OpenNext/API dry run exit0. Final clean E2E43/43 passed three consecutive times (26.9s,30.6s,28.5s). Fourteen tested implementation/configuration files match the commit checkout byte-for-byte.
- Actual remote acceptance on69da0f1: [run39624159815](https://github.com/2ve2/FolioCraft/actions/runs/39624159815) completed successfully for validate, workers, integration and e2e. The browser job reports43 passed (41.1s); full job approximately2m08s. Earlier clean-install import defects were corrected and their failed run is retained in the evidence. The final follow-up commit changes documentation only.
- Cleanup verified:0 generated E2E accounts remain; owned API/web and both disposable PostgreSQL servers stopped; ports4300/4400/55432/55433 closed. Pre-existing untracked docs/ADMIN_CONSOLE_TASK.md preserved.
- Active source work:none. Blockers:none for this scope. Next action: human reviews/merges PR4. Required provisioning/new secrets/production migration/deployment:none. [Full evidence](evidence/2026-10-21-playwright-e2e.md).
- Not verified: real email/R2/image uploads, hosted cookies/persistence, staff MFA through Playwright and other browser/device engines. Existing deployed-trial limits below remain open.

## Earlier completed work — database pool errors (PR #3, merged), 2026-10-21
- Merged as PR #3 (branch codex/pool-error-diagnostics, based on fetched origin/main ba37ac6). Safe allowlisted diagnostics and a proven local pg-cloudflare normal-close defect are fixed; no deployment or Neon/provider access was performed.
- Cause: normal socket.close() aborts the pending adapter read, forwarding the same error to the idle pool listener after pool.end. Three identity-traced workerd requests prove provenance. The pinned Bun patch uses graceful writable close for end(), retaining forced destroy and real error logging.
- Verification: all eleven requested gates passed. Web 37/0/685 assertions; guarded API 69 pass/12 unchanged conditional skips/0 fail/5207 assertions plus MFA child 11/0/308; seven new actual workerd checks, including 12 isolated concurrent connections and retained 57P01; storage 8/8; mail 15/15; Next 49/49, OpenNext and API dry run exit 0. Regression fails before fix and passes after it. Repeated local API flow drops from eight pool errors to zero.
- Active source work: none. Code blockers: none. Hosted historical-event attribution, Neon autosuspension/TLS, real reset/upload delivery and browser UI acceptance remain unverified. No pool-size, deadline, transaction, security or schema change. Local accounts cleaned; all investigation servers stopped.
- Next action: human reviews/merges the PR, installs the frozen lockfile and deploys the API only, then captures projected events if any recur. No migration/new secret/web deployment is required. [Evidence](evidence/2026-10-21-pool-error-investigation.md), [ordered rollout/capture](OPERATIONS.md#database-pool-error-capture--2026-10-21).

Updated: 2026-10-22, Asia/Riyadh. This page is the short continuation point. Older detail is in [STATUS-ARCHIVE.md](STATUS-ARCHIVE.md); step evidence is in [evidence/2026-10-20-audit-fixes.md](evidence/2026-10-20-audit-fixes.md) and [evidence/2026-10-20-locale-routing.md](evidence/2026-10-20-locale-routing.md).

## Deployed friends-only trial

- https://lord2ve.tech (web) and https://api.lord2ve.tech (API), temporary domain; the platform name Ichnara is confirmed.
- The audit fixes (PR 2ve2/FolioCraft#1) are merged into `main`. The human reported running the database migrations and deploying from the independent checkout; the new Worker version ids were not recorded in this session and hosted behaviour was not verified from here (network policy).
- Known hosted limits: mailbox delivery of the new email templates is unconfirmed; MFA and upload are not acceptance-tested; signup skips email verification by human instruction; no staging, monitoring or scheduled backups.

## Previous work: language path prefixes (branch `claude/modest-davinci-osg31w`, not deployed)

- Root fix for the "refresh on every page change" report: platform pages are served under `/ar/...` and `/en/...`, prerendered with final text and direction, so no page shows a loading screen to restore its language. Old `?lang=` links redirect to the matching prefix and keep their tokens.
- No page mixes Arabic and English any more: single-language portfolio error page, localized browser-tab titles, 404 pages in the URL's language, Arabic-only logo label, real `/p/<slug>` in the studio preview bar.
- Emails read their language from the callback path prefix.

## Previous locale-routing verification (local)

Typecheck exit 0; Biome 392 files, 0 issues; web 37 pass / 0 fail / 685 assertions; guarded API 66 pass / 12 skip / 0 fail / 5143 assertions; Workers storage 8/8; Workers mail 15/15; `next build` and OpenNext build exit 0; redirects, Arabic server HTML and titles verified in local workerd; Chromium navigation shows zero loading screens on page changes and language switches. Details and known limits in the locale-routing evidence file.

## Blockers

- None for the E2E scope. Hosted verification of the pool fix requires the human-operated API deployment and projected-event capture described above.

## Next actions

1. Human: review and merge PR4. This test-only change requires no deployment or production migration.
2. Human: if not done yet, deploy the API from main for the merged pool fix (PR #3) and capture any pool-error recurrence. No database migration, web deployment or new secret is required.
3. Human: send one password-reset email to a private mailbox to confirm delivery and the new single-language template.
4. Human: decide the legal page contact address, retention periods and governing law; then set `TRIAL_SKIP_EMAIL_VERIFICATION=false` once mail delivery is confirmed.
5. Human: review/merge PR5 and configure monitoring using MONITORING.md. Further infrastructure work (Hyperdrive, public response caching), platform color tokens and hosted pool-error follow-up remain outside this task. Staging was cancelled by the human.
