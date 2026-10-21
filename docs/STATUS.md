# Current status

## Latest completed work — database pool errors, 2026-10-21
- Branch codex/pool-error-diagnostics, based on fetched origin/main ba37ac6. Safe allowlisted diagnostics and a proven local pg-cloudflare normal-close defect are fixed; no deployment or Neon/provider access was performed.
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

## Verification evidence (local)

Typecheck exit 0; Biome 392 files, 0 issues; web 37 pass / 0 fail / 685 assertions; guarded API 66 pass / 12 skip / 0 fail / 5143 assertions; Workers storage 8/8; Workers mail 15/15; `next build` and OpenNext build exit 0; redirects, Arabic server HTML and titles verified in local workerd; Chromium navigation shows zero loading screens on page changes and language switches. Details and known limits in the locale-routing evidence file.

## Blockers

- No source blocker. Hosted verification requires the human-operated API deployment and projected-event capture described above.

## Next actions

1. Human: review and merge this branch, install the frozen lockfile, then deploy the API only and capture any pool-error recurrence. No database migration, web deployment or new secret is required.
2. Human: send one password-reset email to a private mailbox to confirm delivery and the new single-language template.
3. Human: decide the legal page contact address, retention periods and governing law; then set `TRIAL_SKIP_EMAIL_VERIFICATION=false` once mail delivery is confirmed.
4. Engineering backlog not started: error tracking/uptime alerts, Hyperdrive, public response caching, a staging environment, a committed Playwright E2E suite, platform color tokens, and hosted follow-up for `database_pool_error` if it recurs after this fix.
