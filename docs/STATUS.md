# Current status

Updated: 2026-10-20, Asia/Riyadh. This page is the short continuation point. Older detail is in [STATUS-ARCHIVE.md](STATUS-ARCHIVE.md); step evidence is in [evidence/2026-10-20-audit-fixes.md](evidence/2026-10-20-audit-fixes.md) and [evidence/2026-10-20-locale-routing.md](evidence/2026-10-20-locale-routing.md).

## Deployed friends-only trial

- https://lord2ve.tech (web) and https://api.lord2ve.tech (API), temporary domain; the platform name Ichnara is confirmed.
- The audit fixes (PR 2ve2/FolioCraft#1) are merged into `main`. The human reported running the database migrations and deploying from the independent checkout; the new Worker version ids were not recorded in this session and hosted behaviour was not verified from here (network policy).
- Known hosted limits: mailbox delivery of the new email templates is unconfirmed; MFA and upload are not acceptance-tested; signup skips email verification by human instruction; no staging, monitoring or scheduled backups.

## Latest work: language path prefixes (branch `claude/modest-davinci-osg31w`, not deployed)

- Root fix for the "refresh on every page change" report: platform pages are served under `/ar/...` and `/en/...`, prerendered with final text and direction, so no page shows a loading screen to restore its language. Old `?lang=` links redirect to the matching prefix and keep their tokens.
- No page mixes Arabic and English any more: single-language portfolio error page, localized browser-tab titles, 404 pages in the URL's language, Arabic-only logo label, real `/p/<slug>` in the studio preview bar.
- Emails read their language from the callback path prefix.

## Verification evidence (local)

Typecheck exit 0; Biome 392 files, 0 issues; web 37 pass / 0 fail / 685 assertions; guarded API 66 pass / 12 skip / 0 fail / 5143 assertions; Workers storage 8/8; Workers mail 15/15; `next build` and OpenNext build exit 0; redirects, Arabic server HTML and titles verified in local workerd; Chromium navigation shows zero loading screens on page changes and language switches. Details and known limits in the locale-routing evidence file.

## Blockers

- None for this branch. Hosted verification needs the human to deploy.

## Next actions

1. Human: review and merge the pull request for this branch, then deploy the API and then the web from the independent checkout (no database migration in this change).
2. Human: send one password-reset email to a private mailbox to confirm delivery and the new single-language template.
3. Human: decide the legal page contact address, retention periods and governing law; then set `TRIAL_SKIP_EMAIL_VERIFICATION=false` once mail delivery is confirmed.
4. Engineering backlog not started: error tracking/uptime alerts, Hyperdrive, public response caching, a staging environment, a committed Playwright E2E suite, platform color tokens, and the logged `database_pool_error` investigation.
