# Deployment readiness: migration command and signup email verification — 2026-10-22

Request: after PR #12 the human ran `bun run db:migrate` in the independent checkout and it failed with missing `DATABASE_URL`, `BETTER_AUTH_SECRET`, `API_URL` and `WEB_URL`. The human also asked to turn signup email verification on, enable the published-page cache and add Sentry, with clear instructions. Branch `claude/modest-davinci-osg31w` (main `c06c5d2` merged in). Nothing was deployed; no hosted system, secret or provider was accessed.

## Migration command

- Cause: `src/db/migrate.ts` imported the application database module, which validates the whole API environment, so applying SQL demanded auth secrets and origins.
- Change: the script validates only `DATABASE_URL`, opens one connection, prints `Applying migrations to <host>/<database>` (no credentials) and closes the pool even on failure. A missing or non-`postgresql://` URL prints one readable line and exits 1.
- Checks (local `folio_test`, clean environment via `env -i`, `bun --no-env-file`):
  - no URL → `Set DATABASE_URL to the database you intend to migrate`, exit 1;
  - `postgres://x` → `DATABASE_URL must start with postgresql://`, exit 1;
  - only `DATABASE_URL` set → `Applying migrations to 127.0.0.1/folio_test`, `Migrations applied`, exit 0.
- The guarded API test wrapper (which runs `bun run db:migrate`) and the e2e runner (which runs the script directly) still pass.

## Signup email verification

- Both API manifests (`wrangler.toml`, `wrangler.cache.toml`) set `TRIAL_SKIP_EMAIL_VERIFICATION="false"`. It takes effect only when the API is redeployed.
- Studio: a signed-in session whose account is not verified now shows "confirm your email" with a resend link, retry and sign-out, instead of the generic load error. `EMAIL_NOT_VERIFIED` in other studio operations shows the same message.
- Local proof with production settings (`NODE_ENV=production`, HTTPS origins, `MAIL_TRANSPORT=resend_http` with the Resend HTTP call intercepted in-process, local `folio_test`; script kept in ignored `work/qa/verify-flow.qa.ts`, the test account deleted afterwards):

| Step | Result |
| --- | --- |
| Sign up | 200, `token: null`, no session cookie, 1 verification message submitted |
| Sign in before verifying | 403 `EMAIL_NOT_VERIFIED`, a fresh message submitted (2 total) |
| Open the verification link from the message | 302 to `https://<web>/ar/verify-email?verified=1` |
| Sign in after verifying | 200 with a session |
| `GET /api/sites` with that session | 200 |

- Not proven: hosted mailbox delivery (Resend acceptance was recorded on 2026-10-20; receipt was not), the studio unverified screen in a real browser with a hosted pre-existing session.

## Gates

Typecheck exit 0; Biome clean; web 58/58; guarded API 93 pass / 12 conditional skips / 0 fail; Playwright 54/54 (2.8 min, local Chromium).
