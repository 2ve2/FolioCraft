# Current status

Updated: 2026-10-22, Asia/Riyadh. This page is the short continuation point. Every earlier status section is kept unchanged in [archive/STATUS-ARCHIVE.md](archive/STATUS-ARCHIVE.md); step evidence is in [evidence/](evidence/).

## Product and trial

- Ichnara (confirmed name), a bilingual Arabic/English portfolio builder. Friends-only trial on the temporary domain: https://lord2ve.tech (web) and https://api.lord2ve.tech (API).
- `main` contains PRs #1–#11: audit fixes, `/ar` and `/en` language prefixes, the pool-close fix, the committed Playwright suite, optional Sentry monitoring, optional Hyperdrive, platform color tokens, optional published-page caching (off by default), signed-in entry and tab-return fix, and the immediate studio frame with the Next.js 16.4.1 security update.
- Unknown: which `main` commit each trial Worker runs. The human deploys from the independent checkout; this session cannot reach the trial hosts (network policy).

## Active work

- Full project audit and cleanup on `claude/modest-davinci-osg31w` (scope in [CHANGELOG.md](CHANGELOG.md)). Done so far: verified-unused admin views, helpers, copy keys, styles and tokens removed; documentation reorganized with history moved to [archive/](archive/). Visual identity unified (fonts, type scale, weights, radii, accent family, page column). A four-part code review found no critical issue; its 21 findings and their status are listed in [evidence/2026-10-22-full-audit.md](evidence/2026-10-22-full-audit.md). Fixes for the verified findings are in progress; anything not fixed in a later commit on this branch is still open.

## Blockers

- None locally. Everything hosted depends on human-operated deployments.

## Next actions (human)

1. Deploy the API, then the web, from the independent checkout after `bun install --frozen-lockfile`; this ships PRs #10 and #11 including the Next.js security update. No migration or new secret.
2. Configure Sentry following [MONITORING.md](MONITORING.md). UptimeRobot is reported done by the human (not verified here).
3. Administration access: the trial account still has the legacy `admin` role, which the console no longer accepts. Converting it to `owner` follows the reviewed manual procedure in [OPERATIONS.md](OPERATIONS.md) and needs explicit authorization; then enroll TOTP.
4. Send one password-reset email to a private mailbox to confirm delivery; decide the legal contact address, retention periods and governing law; then set `TRIAL_SKIP_EMAIL_VERIFICATION=false`.
5. Later, together: enable published-page caching ([PUBLIC_CACHE.md](PUBLIC_CACHE.md)) after Sentry, and Hyperdrive ([HYPERDRIVE.md](HYPERDRIVE.md)) after measurement.

## Known limits

- Hosted mailbox delivery, uploads on the trial, MFA in the hosted browser, other browser engines and physical devices are not acceptance-tested.
- Measurements in recent evidence files are local; trial latency is not measured.
