# Current status

Updated: 2026-10-20, Asia/Riyadh. This page is the short continuation point. The previous detailed STATUS (all checkpoints through the Resend HTTP rollout) was moved unchanged to [STATUS-ARCHIVE.md](STATUS-ARCHIVE.md). Step-by-step evidence for the latest work is in [evidence/2026-10-20-audit-fixes.md](evidence/2026-10-20-audit-fixes.md).

## Deployed friends-only trial (unchanged by the latest work)

- Web `82572492-b169-427f-97eb-43cb96eefbcb` at https://lord2ve.tech and API `8cb69cb5-1270-4e27-b3a0-e0b65b07e9d4` at https://api.lord2ve.tech (temporary domain), built from `main` at `5fee8f1`. The platform name Ichnara is confirmed; the domain is not final.
- Known hosted limits: Resend accepted a reset submission, but mailbox delivery is unverified; browser sign-in cookies, MFA and upload are not acceptance-tested; signup skips email verification by human instruction; no staging, monitoring or scheduled backups.

## Latest work: audit fixes (branch `claude/modest-davinci-osg31w`, not deployed)

Separate commits on top of `5fee8f1`, each with its own evidence section:

- **Identifiers:** cuid2 for all new records via `newId()`/`idSchema` (human request); migration `0008` converts domain ids from `uuid` to `text`, keeping every stored value (local legacy-data proof).
- **Correctness:** byte-wise keysets (fixes the intermittent CI failure); public portfolio pages return 5xx + noindex when the release cannot be read.
- **Security and privacy:** web CSP/anti-framing/HSTS headers; owner links `rel="ugc nofollow"`; draft privacy, terms and content-policy pages; data export now includes the subject's draft and active release; account removal queues R2 deletion.
- **Operations:** daily Cron maintenance (expired auth/rate rows, abandoned uploads, R2 deletion queue, migration `0009`); newest 50 releases kept per site; CI builds/tests the deployed Workers bundles.
- **UX/a11y/i18n:** Arabic portfolios render `<html lang="ar" dir="rtl">` from the server (one API call per page view); visible focus ring token; single-language auth emails.
- **Maintenance:** Tailwind and three unused helper packages removed (pixel-identical screenshots); `next-env.d.ts` untracked; stale docs corrected.

## Verification evidence (final HEAD, local)

`bun install --frozen-lockfile` no changes; `bun audit` clean (456 packages); typecheck exit 0; Biome 385 files, 0 issues; web 34 pass / 0 fail / 658 assertions; guarded API 65 pass / 12 skip / 0 fail / 5140 assertions on a fresh ICU `en-US` `folio_test` (all 10 migrations); enforced-MFA child 11 / 308; `db:verify-restore` 12 tables; Workers storage 8/8; Workers mail 15/15; `next build` 28 static pages; OpenNext build exit 0; dry-runs API 4656 KiB / 830 KiB gzip and web 6700 KiB / 1354 KiB gzip. Browser checks (Chromium, local production build) are listed per step in the evidence file. Nothing was deployed and no production system, secret or provider was accessed.

## Blockers

- **GitHub push refused (HTTP 403):** Claude's GitHub App has no write access to `2ve2/FolioCraft`, so the branch exists only in the working session. Human action: reconnect GitHub at https://claude.ai/connect-github and install the Claude GitHub App on the repository.
- The live trial hosts were unreachable from the audit environment (network policy), so hosted behaviour after these changes is unverified.

## Next actions

1. Human: restore GitHub access; then push the branch, open a pull request and confirm the new `workers` CI job passes remotely.
2. Human: review the draft legal pages and decide the contact address, retention periods and governing law.
3. Before deploying this branch (human-authorized): back up Neon; run `bun run db:migrate` against the trial database (0008 rewrites id column types in place, 0009 adds a table); deploy API then web; confirm the Cron Trigger and `maintenance_completed` in Worker logs.
4. Verify SPF/DKIM/DMARC and real mailbox delivery, then set `TRIAL_SKIP_EMAIL_VERIFICATION=false` before inviting people beyond friends.
5. Remaining audit items not started: Hyperdrive, public response caching, error tracking/uptime alerts, a staging environment, a committed Playwright E2E suite and color tokens for the platform UI.
