# Current status

Updated: 2026-10-22, Asia/Riyadh. This page is the short continuation point. Every earlier status section is kept unchanged in [archive/STATUS-ARCHIVE.md](archive/STATUS-ARCHIVE.md); step evidence is in [evidence/](evidence/).

## Product and trial

- Ichnara (confirmed name), a bilingual Arabic/English portfolio builder. Friends-only trial on the temporary domain: https://lord2ve.tech (web) and https://api.lord2ve.tech (API).
- `main` contains PRs #1–#12 (#12: full audit and cleanup): audit fixes, `/ar` and `/en` language prefixes, the pool-close fix, the committed Playwright suite, optional Sentry monitoring, optional Hyperdrive, platform color tokens, optional published-page caching (off by default), signed-in entry and tab-return fix, and the immediate studio frame with the Next.js 16.4.1 security update.
- Unknown: which `main` commit each trial Worker runs. The human deploys from the independent checkout; this session cannot reach the trial hosts (network policy).

## Active work

- Deployment readiness on `claude/modest-davinci-osg31w`: `db:migrate` needs only `DATABASE_URL`; signup email verification on in both API manifests; studio confirm-your-email state for unverified sessions. Evidence: [evidence/2026-10-22-email-verification.md](evidence/2026-10-22-email-verification.md). Next: human review and merge, then the deployment below.

## Blockers

- None locally. Everything hosted depends on human-operated deployments.

## Next actions (human)

1. Confirm mail delivery first: request one password reset for the human's own address on the current trial and check the inbox (and spam). Only then merge the deployment-readiness PR, because it turns email verification on.
2. Deploy the backlog (the trial may not have been deployed or migrated since PR #3): `git switch main`, `git pull --ff-only origin main`, `bun install --frozen-lockfile`; Neon backup branch; `bun run db:migrate` with the Neon `DATABASE_URL` supplied privately for one shell (applies `0010` and anything else pending; it prints the target host); build the web; deploy the API, then the web; check `/health`, sign-in, a new signup's verification email and a published portfolio. No new required secret.
3. Configure Sentry following [MONITORING.md](MONITORING.md). UptimeRobot is reported done by the human (not verified here).
4. Administration access: the trial account still has the legacy `admin` role, which the console no longer accepts. Converting it to `owner` follows the reviewed manual procedure in [OPERATIONS.md](OPERATIONS.md) and needs explicit authorization; then enroll TOTP.
5. Decide the legal contact address, retention periods and governing law.
6. Enable published-page caching ([PUBLIC_CACHE.md](PUBLIC_CACHE.md)) after Sentry, and Hyperdrive ([HYPERDRIVE.md](HYPERDRIVE.md)) after measurement.

## Known limits

- Hosted mailbox delivery, uploads on the trial, MFA in the hosted browser, other browser engines and physical devices are not acceptance-tested.
- Measurements in recent evidence files are local; trial latency is not measured.
