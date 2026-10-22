# Current status

## Active work — owner monitoring, 2026-10-22
- The human selected Sentry Developer + UptimeRobot Free. Staging is cancelled; no staging resources or changes are part of this branch. Branch `codex/owner-monitoring` starts at fetched main `97bfd30`.
- Implemented optional server-only API/OpenNext capture, actual Worker-version tags, strict outgoing privacy allowlist, handled 5xx/unhandled/Cron failure capture, HEAD/OPTIONS coverage, web liveness and bilingual privacy updates retaining the draft notice. DSN is a Worker secret only; absent/invalid DSN or version disables capture. No browser SDK/CSP change.
- Final local acceptance: all required gates pass; API75 pass/12 existing conditional skips/0 fail/5264 assertions plus MFA11/0/308, web37/0/685, Biome419, storage8/8, mail15/15, Next/OpenNext50/50 and both dry runs exit0. Workerd28/28, database runtime7/7, Chromium43/43 (30.4s). Actual built web /health and /en make zero API/database requests; one deliberate render failure yields one scrubbed event. Source/config parity491 files, zero mismatches.
- Active: save completed implementation and operational documentation in separate commits, push the branch and open an unmerged PR. No task commits/push/PR yet. Final bundles: API5130.08 KiB/gzip938.15; web9695.11 KiB/gzip1996.45, approximately14.8% of the current official64MiB raw Free limit. No deployment, hosted database/provider operation, account/secret creation or live alert acceptance.
- Temporary blocker resolved: automatic approval service hit its quota on 2026-10-21; the last test command was not executed then. Human requested continuation on 2026-10-22, and the mocked runtime rerun passed. Local test PostgreSQL is still running; sandbox networking cannot observe its host namespace. No reset was needed or performed.
- Next action: finish gates and source parity, commit completed steps, push/open PR, stop the owned local test database, provide the human [setup/release checklist](MONITORING.md). [Comparison and evidence](evidence/2026-10-21-owner-monitoring.md).

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

Updated: 2026-10-21, Asia/Riyadh. This page is the short continuation point. Older detail is in [STATUS-ARCHIVE.md](STATUS-ARCHIVE.md); step evidence is in [evidence/2026-10-20-audit-fixes.md](evidence/2026-10-20-audit-fixes.md) and [evidence/2026-10-20-locale-routing.md](evidence/2026-10-20-locale-routing.md).

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
5. Engineering backlog not started: error tracking/uptime alerts, Hyperdrive, public response caching, a staging environment, platform color tokens, and hosted follow-up for `database_pool_error` if it recurs after the fix.
