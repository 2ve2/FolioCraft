# Operations and integrations

Last reviewed: 2026-10-19, Asia/Riyadh. See Current round4 operations for the latest administration runbooks and explicit open decisions. This file describes current configuration and operational requirements that remain untested. Actual results are in `STATUS.md`; these instructions do not establish production readiness or mail delivery. Real local R2 evidence is recorded below and in STATUS.

The friends-testing Cloudflare trial is deployed. See [CLOUDFLARE.md](CLOUDFLARE.md) for actual Worker versions, HTTPS origins, build commands, request-scoped runtime behavior, temporary email-verification exception and remaining acceptance. Older local proof below does not imply hosted upload/mail acceptance.

## Components and files

- `apps/api`: Bun + Hono, Better Auth, Drizzle, and `pg`. `app.ts` composes HTTP; `server.ts` runs Bun, derives client addresses, and closes the pool on shutdown.
- `apps/web`: independent Next application consuming the API without database access. `NEXT_PUBLIC_API_URL` is the browser-accessible API URL; `API_URL` is used for public reads from the web server.
- `packages/contracts`: version1 Zod content contracts with optional additions compatible with legacy drafts.
- `packages/portfolio`: shared renderer; section editors, images, and public details are implemented. Acceptance evidence and limitations are in STATUS.md.
- Secrets belong in backend runtime variables or an ignored local `.env`. `apps/api/.env.example` contains placeholders only. Never log `DATABASE_URL`, SMTP/R2 credentials, passwords, session cookies, or signed URLs.

## Local development

From the project root, using Bun:

```sh
bun install --frozen-lockfile
bun run typecheck
bun run check
```

Copy the environment example locally and supply configuration for this project. Never use accounts or the database of the the reference project reference project. Match hostnames: `localhost:3000` and `localhost:4000` differ from `127.0.0.1` for origins and cookies.

After reviewing migrations, before starting API against a new database:

```sh
bun run db:migrate
bun run dev:api
```

In a separate process:

```sh
bun run dev:web
```

`db:migrate` applies pending SQL to the **current DATABASE_URL** and needs no other variable (since 2026-10-22 it does not load the API's auth secrets or origins). It prints the target host and database name, never the credentials; verify that target before anything changes. For a hosted database, supply the URL privately for one shell, for example `read -rs DATABASE_URL && export DATABASE_URL`, run the command, then `unset DATABASE_URL`; never put it on a visible command line, in a file in the repository or in chat. It does not replace a backup or approval of a production upgrade. `db:generate` produces reviewable schema migration files; do not use `drizzle-kit push` or reset/truncate for operation.

To verify the build:

```sh
bun run build
```

The API container definition is `apps/api/Dockerfile`, with repository root as build context; Bun1.4.2, production dependencies filtered to `@folio/api`, user `bun`, and `NODE_ENV=production HOST=0.0.0.0`. `.dockerignore` excludes env secrets, work, and node_modules. Local build example only:

```sh
docker build -f apps/api/Dockerfile -t foliocraft-api .
```

Docker does not run migrations at startup; provide runtime secrets and apply migrations in a separate reviewed step. A Dockerfile alone does not prove a successful image build or container deployment. Independent Bun compilation does not verify the container or production environment; actual results belong in STATUS.

API starts independently with `bun run --cwd apps/api start`. Web builds and starts independently through its own scripts. Operational endpoints: `GET /health` for process liveness and `GET /ready` for PostgreSQL connectivity and integration configuration presence. `configured` means complete variables, not successful upload or delivery.

## Required production environment

| Variable | Meaning |
|---|---|
| `NODE_ENV=production` | Enables HTTPS origins and secure cookies; verification is required unless the explicit trial exception is enabled |
| `TRIAL_SKIP_EMAIL_VERIFICATION` | Defaultfalse; true only for the human-authorized friends-testing trial with no SMTP |
| `HOST=0.0.0.0` | Listen inside a container/server behind a reverse proxy; do not directly expose the API port when relying on the proxy |
| `PORT` | Default4000, range1–65535 |
| `API_URL` | Backend HTTPS origin without path/trailing slash; illustrative `https://api.example.com` |
| `WEB_URL` | One allowed frontend HTTPS origin; illustrative `https://app.example.com`, not a purchased or connected domain |
| `BETTER_AUTH_SECRET` | Long project-specific random secret; enforced minimum32 characters |
| `DATABASE_URL` | Dedicated PostgreSQL connection; production uses TLS with certificate/hostname verification such as `sslmode=verify-full` and the provider's correct CA configuration |
| `DB_POOL_MAX` | Default10, range1–100; plan total pools across instances against database provider limits |
| `DB_CONNECT_TIMEOUT_MS` | Default5000, range100–60000 |
| `DB_STATEMENT_TIMEOUT_MS` | Default15000, range1000–120000 |
| `TRUSTED_PROXY_IPS` | Comma-separated exact proxy socket addresses only; empty by default |
| Complete SMTP group | Required for normal production startup; the explicit trial skip permits unavailable mail |
| Complete R2 group | Optional; missing configuration explicitly disables storage uploads/reads |

`DATABASE_URL` currently validates the `postgresql://` prefix; TLS selection and full verification are connection configuration responsibilities, not proven production validator checks. `pg` uses a connection string and pool with real transactions, not the Neon HTTP driver. When combining SSL options and connection strings, review [node-postgres SSL](https://node-postgres.com/features/ssl) to avoid URL options replacing certificate configuration. Do not disable certificate verification in production.

The Cloudflare trial uses HTTPS workers.dev origins. Hosted signup/sign-in, saves and publication were observed; custom domains, broader cookie/security acceptance and actual verification/reset delivery remain unproven. Bun reverse-proxy examples below apply to the server target, not the Workers entry.

## Client address and reverse proxy

`server.ts` takes the actual socket address from Bun. It trusts `x-real-ip` only when the socket exactly matches `TRUSTED_PROXY_IPS` and the header contains one valid IP. It does not trust client-supplied `x-forwarded-for` or `cf-connecting-ip`. It replaces incoming `x-folio-client-ip` with a derived value used by Better Auth and inquiry limits.

Add exact proxy addresses after deciding actual topology; do not use CIDR, wildcards, or hostnames in this list. The proxy must **replace** client-supplied `x-real-ip` with the address it observed rather than forwarding it unchanged. Illustrative Nginx block inside an existing HTTPS server:

```nginx
location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

This example configures neither TLS nor an additional proxy chain. For multiple proxies or a CDN, document the chain, restrict access, and test spoofing. Direct Hono tests have no socket layer; their supplied headers do not prove production client identity.

The Workers entry uses the Cloudflare-injected client address and replaces x-folio-client-ip; it does not apply the Bun socket TRUSTED_PROXY_IPS path. Preserve this distinction when testing spoofing or choosing a deployment target.

## Mail and account verification

The complete group is required, or all values remain empty in development:

```dotenv
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=project-smtp-user
SMTP_PASSWORD=replace-in-secret-store
MAIL_FROM=hello@example.com
```

Examples are placeholders. No SMTP account or sender domain is currently configured. `SMTP_SECURE=true` uses TLS from connection start, commonly on465; `false` enforces STARTTLS in the current transport. Connection/greeting deadlines are10 seconds and socket deadline15 seconds; Nodemailer file/URL access is disabled.

Normal production: `requireEmailVerification=true`, send on registration/sign-in, and `autoSignInAfterVerification=false`. On 2026-10-22 the human asked to turn signup email verification on, so both API manifests now set `TRIAL_SKIP_EMAIL_VERIFICATION=false` (the earlier friends-trial exception set true). The flag only takes effect when the API is redeployed. Confirm mailbox delivery with one password-reset email first. After registration the web app shows the check-your-inbox state; sign-in before verification returns `EMAIL_NOT_VERIFIED` and sends a fresh link; an existing session of an unverified account sees a confirm-your-email screen in the studio with a resend link. The full sequence is proven locally with production settings and intercepted mail delivery (see the 2026-10-22 evidence); hosted mailbox delivery is not. Development permits the unverified local flow, which is not a launch policy.

Password reset and verification resend with unconfigured SMTP return `503 MAIL_UNAVAILABLE`; transport failure returns `MAIL_DELIVERY_FAILED`. Successful reset revokes previous sessions. Messages contain Arabic/English text; the message URL must match the API origin. Never print token links or claim delivery without provider evidence. Inquiry mail is not implemented; inquiries are stored only in the site inbox.

Before declaring mail ready, verify the sender domain with the provider, configure its SPF/DKIM/DMARC requirements, and prove sending, receiving, verification, and reset from the final environment. These are pending steps, not completed DNS changes. Protocol details: [Better Auth Email & Password](https://better-auth.com/docs/authentication/email-password).

## R2 and image uploads

Keep the bucket **private**; do not enable public `r2.dev` or a public custom domain that bypasses release checks. Complete runtime group:

```dotenv
R2_ACCOUNT_ID=replace-with-32-lowercase-hex-characters
R2_BUCKET=portfolio-assets
R2_ACCESS_KEY_ID=replace-in-secret-store
R2_SECRET_ACCESS_KEY=replace-in-secret-store
R2_ENDPOINT=
```

An empty endpoint uses `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` over HTTPS. Optional endpoints must belong to this account within official public/EU/FedRAMP R2 domains, without port/path/query/credentials. SDK region is `auto`; credentials never reach the browser. Grant the R2 key read/write/delete/copy permissions only for the dedicated bucket according to provider policy; never reuse a reference production account.

Configure upload CORS for the **exact WEB_URL**. R2 dashboard example; replace the origin with the selected value:

```json
[
 {
  "AllowedOrigins":["https://app.example.com"],
  "AllowedMethods":["PUT"],
  "AllowedHeaders":["Content-Type"],
  "ExposeHeaders":["ETag"],
  "MaxAgeSeconds":3600
 }
]
```

For local uploads use `http://localhost:3000` in a dedicated test bucket, never a wildcard. Image loading through signed URLs needs no custom fetch; if browser fetch is added later, configure GET/HEAD and required headers specifically after reviewing usage. The existing bucket CORS now also includes the exact Cloudflare trial frontend origin with PUT/Content-Type, exposed ETag and max age3600. Applying that policy is recorded; hosted authenticated upload completion remains unverified. [Cloudflare R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/) explains that a valid signature does not replace browser CORS.

PUT window600 seconds. Backend upload limits:5 MiB, PNG/JPEG/WebP, each side ≤4096, one image without multi-page animation. Completion checks metadata/size, downloads a bounded stream, and fully decodes using Sharp on Bun or the Images adapter on Workers; ETag-conditional copy preserves inspected bytes in `verified/` and prevents replacement through repeated PUT to `staging/`. Never attach an asset before `ready`.

Saving and publication lock asset references and verify ownership/state. Deletion rejects assets referenced by the draft **or any retained historical release**; no historical release deletion policy exists currently. Provider failures return `502 STORAGE_PROVIDER_ERROR`; missing configuration returns `503 STORAGE_UNAVAILABLE`.

Authorized private/public downloads issue signed GET URLs valid60 seconds. Possession grants access until expiry; unpublishing prevents new URLs but does not immediately invalidate earlier ones. Headers request `private,no-store`; public redirects use `no-referrer`. Signature expiry cannot erase a file a visitor already stored.

`POST /api/sites/:id/assets/cleanup` explicitly cleans at most100 items. Deletion retains `deleting` until signed PUT expiry plus one minute; provider failure leaves it retryable. Ready assets clean staging only, not verified. There is no automatic cleanup schedule in the current implementation; arrange an authorized service after hosting is selected. Old rate buckets also have a cleanup service without a documented running scheduler.

On2026-10-13, real R2 testing passed signed upload, image decoding, conditional copy, matching download, verified protection against staging replacement, and deletion. CORS was configured only for http://localhost:3000; a real browser upload with ETag succeeded. Project keys remain only in ignored env. This does not prove the complete authenticated image-editor flow or final production-origin CORS.

## Isolated tests

Safe root command:

```sh
bun run test
```

Runs `scripts/test-api.ts`: sets `NODE_ENV=test`, a test secret, and localhost origins; removes SMTP/R2 configuration from the child environment. Default `postgresql://folio@127.0.0.1:55432/folio_test`. Applies migrations to the **test database**, then runs `bun test tests` inside API.

Create a separate local folio_test cluster/database and restricted role; never put project Neon or any production DATABASE_URL in `TEST_DATABASE_URL`. Do not run `bun run --cwd apps/api test` directly with the working `.env`, which bypasses the isolated wrapper. Local cluster setup is a separate step, not implicit in this guide. The wrapper rejects any explicitly supplied TEST_DATABASE_URL unless host is `localhost`, `127.0.0.1`, or `[::1]` and database is exactly `folio_test`. Local port/role changes are allowed; Neon/production databases are not.

Checks without database/providers: `bun run typecheck` and `bun run check`. The test database proves neither actual SMTP/R2 capability nor production-domain cookie policy. Record **actual execution results** in `STATUS.md`; examples here are not success records.

## Migrations, backups, and restoration

Review SQL in `apps/api/src/db/migrations/` and schema before application. Current `0000` creates auth/sites/releases; `0001` adds assets/inquiries/rate limits; `0002_release_integrity.sql` adds a deferred FK ensuring the published release belongs to its site, asset/site/uploader ownership FKs, and a release UPDATE prevention trigger;0003 adds Better Auth Admin fields, site suspension, and admin_audit. Additional content lives in a revisioned JSONB aggregate, not a table per experience/article. Never use production schema push/reset. Before a production migration: backup, verify the correct target, and review compatibility with the previous app version and anticipated rollback.

Operational backup goal: PostgreSQL custom dump, restoration to a **new independent database**, then migration, record/relation count, sign-in, public snapshot, and draft isolation checks. Seeing a dump file alone does not prove restoration. Never restore with `--clean` against the working database. PostgreSQL backups exclude R2 bytes; assets and their release references require a separate protection procedure.

Specify backup schedule, retention, encryption/location, and RPO/RTO based on the selected host. Current helper: `scripts/backup-db.ts`:

```sh
# From project root; reads API env. Review the target database and authorization first.
bun run db:backup
```

The helper passes connection settings through PostgreSQL variables, never URI/password tool arguments. It requires `pg_dump`; `sslmode=verify-full` uses system CA roots (a trusted `PGSSLROOTCERT` path may be supplied). It writes a custom `--no-owner` dump to `work/backups/portfolio-<timestamp>.dump`, file0600 and directory0700. Failed pg_dump never reports `backup_created`; inspect partial files before relying on them.

Isolated restore verification only, from project root:

```sh
bun run db:verify-restore
```

This mode rejects every database except local `folio_test`, creates temporary `folio_restore_<random>`, runs `pg_restore --exit-on-error --no-owner`, compares twelve table counts (including two_factor) plus temporary fixture Arabic profile/draft/release/published pointer, verifies `release_snapshot_immutable`, deletes **only its created temporary database**, and cleans the exact fixture user from the test source. Requires `createdb,pg_restore,psql,dropdb` and a test role permitted to create databases. This is limited structural evidence, not a substitute for restored sign-in/assets/snapshot tests. Record actual results in STATUS; the helper alone proves neither restoration nor a production backup. Official reference: [PostgreSQL SQL Dump](https://www.postgresql.org/docs/current/backup-dump.html).

## Logs, shutdown, and current limits

Structured request logs include request ID, method, status, and duration without body/cookies. Internal errors log error name, route, and DB code; clients receive a generic code. SIGINT/SIGTERM shutdown stops accepting requests and closes the pool, with a15-second forced-stop deadline; production rolling deployment is unproven.

Pending general-launch requirements: SMTP/sender domain and disabling the trial verification exception; live hosted R2 upload/decoder/rendering acceptance; comprehensive cookie, device and admin checks; multi-instance load/rate-limit measurement; monitoring/alerts and provider backup/restore; scheduled cleanup. Trial API/web HTTPS hosting and exact R2 trial CORS are configured, with the limited proof in CLOUDFLARE and STATUS. Environment or Docker configuration alone does not satisfy these conditions. This guide authorizes neither service purchases nor production deployment.


## Scheduled maintenance — 2026-10-20

`services/maintenance.ts` runs bounded, idempotent housekeeping: rate buckets and Better Auth rate-limit rows idle for over a day, sessions and verification rows expired for over a day, uploads still `pending`/`deleting` an hour after their signed URL expired (marked `deleted`, objects queued), and the `storage_deletions` queue (up to 20 prefixes, 100 keys per prefix and 500 deletions per run; a prefix leaves the queue once it lists empty, provider failures increment `attempts` and retry next run). Queue prefixes are constrained by a CHECK to `staging/<id>/…` or `verified/<id>/…`, so the whole bucket can never be targeted.

- Workers: the API Worker's `scheduled` handler runs it daily from `[triggers] crons = ["17 3 * * *"]` (03:17 UTC) and logs `maintenance_completed` or `maintenance_failed`. The trigger takes effect on the next authorized API deployment.
- Local/manual: `bun run --cwd apps/api maintenance` against the configured `DATABASE_URL`.
- Without R2 configuration the database jobs still run and the queue is kept (`"storage":"disabled"`).

## Administrative operations and limits — P1 (2026-10-18)

No seeded owner or public bootstrap endpoint exists. Legacy admin is not an alias for owner, and P1 does not alter any existing account role. A first-owner/conversion operation needs a separately authorized exact account and reviewed role-field change. Do not infer a CLI command from newer Better Auth documentation; do not perform that change merely to regain access after this rollout.

The shared role policy grants owner/moderator/support/analyst access to explicitly permitted resources; authoritative backend sessions and permissions are checked for every call. Direct native-admin HTTP calls are disabled before Better Auth, including OPTIONS. Use the domain read/moderation endpoints in API.md. Native server-only reads still use Better Auth and its hooks. Browser buttons and Studio membership checks supplement, never replace, backend authorization.

P1 is an intermediate local phase: TOTP enforcement/enrollment, password-per-sensitive-action checks, last-owner transaction protection and audited sensitive reads are P2 work. No role has impersonation or administrative password-setting permission. Native account mutations remain unavailable even for owner until the P2 controls exist, and the console shows an explicit unavailable message. The old direct-native account action UI is removed. Do not deploy this incomplete security program or claim P2 acceptance from P1 tests.

The later human-approved simplified P2 supersedes the earlier last-owner transaction proposal: all set-role and sensitive staff/protected-target operations remain unavailable inside the application. Do not implement advisory locks, owner counting, dedicated lock connections or a transaction-adapter integration for last-owner protection in P2a/P2. Application mutations are limited to eligible ordinary-user targets and their sites; the manual procedure below controls separately authorized staff-role changes. See ADMIN_CONSOLE.md appendix 13. Native/ordinary mutation and audit outcome remain separate failure boundaries unless a later implementation proves otherwise.

Audit reads have no edit/delete API. Site moderation reason/events remain transactional inserts. Native account mutations are closed in P1, so their former outcome UPDATE path is removed; P2 will introduce separate attempt/outcome inserts without rewriting historical rows. Existing historical attempted events are indeterminate and require investigation. The actor FK still uses ON DELETE SET NULL. No tamper-proof database policy, retention scheduler or automatic cleanup is claimed; retention/export policies remain A6 decisions before launch.

Existing UUIDs/timestamp representations and database schemas remain unchanged. P1 verification uses only disposable local folio_test fixtures via the root guarded test wrapper; those fixtures receive synthetic roles and are removed. Existing real accounts, Neon, provider objects and production configuration remain untouched. Earlier restore proof remains historical structural evidence, not a new production/R2/mail acceptance claim.


## Frontend and public assets — 2026-10-14
Authenticated owned upload/complete/save/private preview and real published project cover/gallery decoding passed. Keep public image gateway302 CORP cross-origin scoped to the successful matched public asset route; private/default routes remain same-origin. Preserve current-release checks/no-store and avoid logging signed URLs. Synthetic QA draft/asset/inquiry and additional immutable QA release are retained; original published pointer/snapshot restored exactly.

## Typography, SEO and latest checks — 2026-10-14
Self-hosted fonts live in web dependencies/lockfile; no runtime CDN credentials. Configure NEXT_PUBLIC_WEB_URL to real web origin for canonical/robots/sitemaps. Sitemap index limit50,000 entries requires sharding beyond that; discovery pages100. SEO uses published snapshots, existing available cover images; generated fallback artwork and real social-crawler fetch acceptance remain unverified. Database deadlines: connection5s, server statement15s, client read16s; client deadline does not prove cancellation of server work. Actual transient network stall recovered after API restart, no data reset. Current11 HTTP checks and17 isolated tests passed; see STATUS.

## Current source layout and browser fixture

Source ownership is documented in SOURCE_STRUCTURE.md. The reusable browser seed server lives under apps/api/tests/fixtures/browser-server.ts; scripts/admin-browser-fixture.ts is its thin entry point. Always use the guarded root command `bun run test --admin-browser`, not an inherited development/Neon environment. It uses local folio_test and API127.0.0.1:4400 with web127.0.0.1:4300, uniquely generated users and private0600 temporary credentials. Closing the process cleans only that run's fixture users/audit rows.

During an observed local Neon connection delay, a read-only connection took7857ms against a5000ms deadline. The ongoing local API session was restarted with `DB_CONNECT_TIMEOUT_MS=20000` as a temporary runtime override; source defaults, hidden environment files and production policy were not changed. Recheck connectivity and choose deployment deadlines from real measurements, not this one sample.

## Web checks and runtime alignment — 2026-10-18
- `bun run test:web` runs apps/web/tests independently of the guarded database suite. GitHub validate job and scripts/check.sh include this command. Integration job still calls only the existing root `bun run test` wrapper, which refuses remote hosts and any database other than local folio_test.
- Local `bun --version` is1.4.2. Both CI jobs already pin1.4.2, so no version update is required; do not change it solely to create a diff. Workspace package types may have a different release number than the installed runtime.
- Local gates do not establish remote CI. This scope does not push, and no new remote run has been observed.


## P2a reviewed manual staff-role change procedure — design only (2026-10-18)

The human approved documenting this procedure, not executing it. No actual account is selected or queried here. Application set-role and sensitive staff-target actions remain closed even for owner; no CLI/bootstrap endpoint, shared-password path or automatic fallback is introduced. This replaces earlier proposed in-application last-owner locking for the simplified P2 scope.

1. Obtain separate explicit human authorization for the exact environment, exact existing account, intended role string and whether this is a promotion/demotion/conversion. Independently review the existing and requested role sets against owner/moderator/support/analyst/user; legacy admin has no automatic alias. The reviewer must understand the effect on human operator access. Do not treat approval of this design as approval of any account or production change.
2. Prepare a parameterized operator change for one exact primary-key identity, guarded by its reviewed current role value and an expected affected-row count of one. Include a read-only before/after check and an explicit rollback plan if the role comparison/count differs. Store account identifiers, grant evidence and any credentials only in the human's protected operational record, not versioned Markdown, command-line history or this repository's commits. Do not invent a Better Auth CLI command.
3. Arrange an approved maintenance window. Pause and drain affected administrative/sensitive API requests before the database change; include site moderation for sites owned by the target. There is no claimed existing maintenance toggle. If the available gateway cannot guarantee that pause, use an explicitly authorized API shutdown/drain procedure; do not pretend repeated role reads alone prevent a concurrent manual promotion. This procedure authorizes no restart, deployment or traffic change by the agent now.
4. Verify the intended database/environment without printing its connection secret. Review the transaction's SQL independently before execution. The planned transaction changes only the authorized role value, with target/session-revocation handling separately included in that same review. Revoke the target's existing auth sessions and any session-provenance records associated with them so a pre-change session cannot inherit the new privilege; no cookie/session token is copied to the operator record. Do not edit twoFactorEnabled, factor secrets/verified flags, passwords, bans or other user fields to simulate privilege or enrollment. No schema migration, reset or bulk role rewrite is part of this procedure.
5. An authorized operator, not an application fallback, executes the reviewed transaction with its exact-ID/current-role guard and validates the affected rows before commit. A mismatch rolls back. There is no claimed automatic last-owner protection; preserving an authorized human owner/access path is a manual reviewer responsibility. Never use session advisory locks on a transaction-pooled connection, and do not add an application advisory lock as a substitute for the maintenance procedure.
6. Before reopening administrative traffic, validate the persisted role and session invalidation with sanitized evidence. The human signs in again; newly privileged staff must complete real TOTP enrollment and a native password/TOTP sign-in, not a direct database flag edit. Verify the allowed/denied resource behavior and normal public-site availability. Failure means keep operations closed and follow the approved rollback/recovery plan; never promote a second account silently or enable a hidden native HTTP bypass.
7. Record who approved, reviewed and executed the change, when, the old/new role sets and actual checks in the protected operational record. Application admin_audit cannot observe an out-of-band database edit automatically; do not fabricate an application audit event or claim otherwise. Versioned project notes may record generic completion/limits only when the human permits it, without account identifiers or grant evidence.

This procedure remains unexecuted. Production access, any actual role change and traffic/deployment operations each require their own authorization. MFA recovery/reset for staff is a separate reviewed procedure and is not achieved by altering role or TOTP database flags.

## MFA configuration and encryption keys — P2b-1 (2026-10-19)

Migration 0004 is generated by drizzle-kit and adds two_factor, user.two_factor_enabled and the hidden session.admin_totp_factor. It has been applied only through the guarded test runner to local folio_test. No production application or role change is authorized. Review the exact generated migration and obtain separate authorization before any hosted rollout; preserve the old app's compatibility and an additive rollback plan without dropping enrolled factor data.

ADMIN_REQUIRE_MFA defaults to true. Production explicitly rejects false; only development/test may opt out. The normal isolated RBAC suite sets false deliberately, while its MFA child sets true. `bun run test --mfa-browser` starts the existing guarded local browser fixture with enforcement enabled, API127.0.0.1:4400 and web127.0.0.1:4300. It creates disposable accounts and cleans them on shutdown; it is not a production bootstrap. Never edit two_factor/user flags or grant a real role to bypass enrollment. Staff sign in, enroll on /admin/security, verify enrollment, then sign out and complete a new password/TOTP sign-in through /admin/mfa-required. Backup-code recovery alone does not unlock administration. A lost authenticator requires separately reviewed recovery; this batch provides no emergency bypass.

Better Auth encrypts TOTP secrets and the default stored recovery-code bundle with its encryption secret. Changing BETTER_AUTH_SECRET alone does not re-encrypt existing rows. Actual native synthetic-key tests demonstrate HTTP500 decryption failure for both legacy TOTP and recovery codes after a single-key replacement. Restoring the required legacy key via supported rotation configuration restores decryption; database ciphertext alone cannot recover a lost key. No real secret was changed, disclosed or tested here.

Reviewed rotation procedure (not executed against a real environment):

1. Obtain separate authorization for the exact environment and maintenance/rollback plan. Keep an encrypted database backup and protected copies of every active versioned key and any unversioned legacy key; protect copies independently from database dumps. Never put keys, TOTP URIs, codes or cookies in Git, logs, tickets or command arguments. Verify restore and human access in an authorized isolated environment before retiring anything.
2. The config accepts BETTER_AUTH_SECRETS in the native comma-separated version:secret form. The first entry is the current encryption/signing key; versions must be unique safe nonnegative integers and each secret at least32 characters. Example placeholders: `BETTER_AUTH_SECRETS=2:<new-secret>,1:<previous-secret>`. Each version must always identify the same key. Existing unversioned ciphertext separately needs `BETTER_AUTH_SECRET=<original-unversioned-secret>` as the legacy decryption fallback. Keep that singular original secret while such rows remain. The application requires it and never logs the parsed list.
3. With the version list enabled, newly written ciphertext is version-tagged, for example `$ba$2$...`. Existing rows are not bulk rewritten by loading configuration. Native recovery-code consumption can rewrite that bundle, but does not migrate the factor secret. Do not assume enabling version2 migrated either field or all accounts. Require a separately reviewed re-enrollment/data-transition procedure and field-by-field evidence before retiring the legacy key; no automatic re-encryption utility is included here. Factor-secret ciphertext replacement invalidates its session fingerprint, requiring another native TOTP sign-in.
4. Keep every key version needed by stored ciphertext and by the reviewed session/cookie transition. Tests prove version1 ciphertext fails with native HTTP500 if version1 is removed, even if the singular legacy fallback equals the old key. Restoring version1 to the list succeeds. The singular fallback applies to unversioned ciphertext; it is not a substitute for missing tagged versions. Do not rotate away an unavailable key in an attempt to repair a decryption error.
5. In the authorized maintenance window, validate both existing and newly enrolled synthetic accounts, TOTP verification, recovery-code consumption, admin proof isolation, sign-out/session revocation and a tested rollback configuration. Decryption acceptance does not prove old browser cookies remain valid. Require affected operators to sign in again and test the actual deployment/cookie transition explicitly. Retire a key only after a reviewed inventory proves no required ciphertext, protected backup or transition depends on it. Record sanitized evidence; never test rotation with production secrets in this suite.

Backup helper coverage now counts twelve tables, including two_factor; full pg_dump already includes standard user/session columns and encrypted factor data. No backup or restore was run in P2b-1. Twelve-table counting is structural coverage, not proof of a restored native MFA sign-in. A future separately authorized restore drill must include encrypted factor rows, the required key material and real native TOTP/recovery flows with synthetic identities. Existing historical eleven-table restore evidence is not twelve-table/MFA acceptance.

## P2b-2a audit reconciliation — 2026-10-19

Only the four ordinary-account mutation wrappers and site suspend/resume pipelines are enabled in this batch. Each requires the operator's password and existing TOTP-proven session under enforcement, as well as a 10–500-character reason. New account-console mutation controls, reveal-email, remove-user, general denial limits and staff-role operations remain outside this batch. External native-admin HTTP remains blocked.

An attempted admin_audit row is durable before execution; a separate succeeded or failed row shares its server-generated requestId, actor, action, target and reason. No application writer UPDATEs an audit row. For native actions an attempted row without an outcome can mean interrupted execution or failed outcome persistence. ADMIN_ACTION_INDETERMINATE must trigger review of that correlation and the actual account/session/site state before another invocation. Do not blindly repeat a ban or session revocation or fabricate an audit success to fill a gap. ADMIN_AUDIT_UNAVAILABLE at attempt creation means execution was blocked. Site state and succeeded outcome share one transaction; failure rolls state back, with the durable attempt and separate failed outcome retained when persistence is available.

Permission-denied recording in this scope is bounded to ten writes in 60 seconds for each authenticated actor/action using PostgreSQL rate_buckets. Requests stay denied after suppression; no per-suppressed-request row is emitted. This does not implement the deferred general/anonymous/global-native budgets or change retention policy. Audit rows are application-append-only, subject to the previously documented database-operator/FK limitations. The existing reviewed maintenance procedure still governs external staff-role changes; no atomicity against such concurrent manual changes is claimed.

Verification uses only disposable local folio_test identities through the root test guard. Test-only writer spies inject audit failures without SQL triggers, tables or migrations. Tests cover a request-owned single-connection database scope so moderation's repeated owner check must use its transaction executor rather than request another pool connection. No production fixture, backup/restore, key change or deployment is part of this work.

## Sensitive account controls and reports — 2026-10-19

ADMIN_PASSWORD_MAX_FAILURES=5, ADMIN_PASSWORD_WINDOW_SECONDS=900 and ADMIN_PASSWORD_BLOCK_SECONDS=900 configure a dedicated operator-wide native-password failure window/block. Bounds: failures1–100; durations1–86400 seconds. The threshold starts a full block; correct-password retries remain blocked until expiry, do not extend it and do not erase earlier failures. Invalid request shapes are validation failures, not password guesses. HTTP private-write remains120/60; native password verification never consumes that separate allowance. General anonymous denial logging remains deferred as explained in ADMIN_CONSOLE16. Never automatically repeat an indeterminate destructive operation; reconcile the durable attempt and actual target state first.

Account removal uses native Better Auth and database cascades, including sites/releases/inquiries/assets and (after P3) reports. Since 2026-10-20 the removal also queues the removed sites' `staging/<siteId>/` and `verified/<siteId>/` R2 prefixes in `storage_deletions`; scheduled maintenance deletes them (see "Scheduled maintenance"). Historical audit target IDs remain; actor FK deletion may set actor_id null. No complete-erasure, R2 cleanup job or retention completion claim follows.

Before any separately authorized production rollout of reports, configure a random server-only REPORT_IP_SALT of at least32 characters (prefer32 random bytes encoded as hex), consistently across API instances; never add it to frontend variables or source. Production startup rejects its absence; local report intake returns REPORTING_UNAVAILABLE without it. The empty .env.example entry is intentional. The generated migration0005_parallel_ultimates.sql has been applied only on isolated local folio_test through bun run test, not to production. Review its full SQL and arrange separate production authorization before applying it elsewhere.

Reports accept5 IP-hash-wide attempts/hour and20 site-wide attempts/hour; valid duplicates count. Identical submissions suppress extra inserts for300 seconds. The shared rate bucket cleanup retains its existing schedule/implementation; no new scheduled job was created. Salt rotation creates new IP identities and therefore fresh IP quotas and dedup matches while site limits remain; do not claim continuous IP budgets during rotation or deploy inconsistent salts across instances. Stored historical hashes are not rewritten. No raw IP is stored in reports or administrative DTOs/logs. Report contact emails remain masked even to owners/support. Public free text can itself contain personal information supplied by the reporter; the system does not claim automatic PII redaction of free text.

Report retention duration and staff review/incident response process remain human policy decisions. There is no automated deletion, reporter notification, email delivery, R2 erasure or legal retention guarantee. Site deletion cascades remove its report rows; handler deletion sets handled_by null without erasing the stored note/time. These are actual relational effects, not a general retention policy.

## Round3 notices and operational counters — 2026-10-19
Generated migration0006_ambiguous_thunderbolt_ross.sql adds only system_notices and its constraints/FK/index; its SQL and snapshot/journal were produced by drizzle-kit. It was applied only through the root guarded folio_test test runner. Production migration/application remains unperformed and needs separate authorization. Deleting a notice creator sets created_by null; ordinary administration offers disable rather than delete. No automatic retention/purge policy is introduced.

ADMIN_AUDIT_EXPORT_MAX_ROWS is a validated integer1–10000, default1000. Each CSV is a bounded filtered page, not an assertion of a complete archive. CSV includes only event/actor/target/request identifiers and action/status/time; excludes all reasons/emails/metadata and neutralizes spreadsheet formulas. Export requires audit.export, native session-bound TOTP, current operator password and10–500 reason, using the existing independent password-failure budget. No auth freshness change.

BUILD_VERSION is a non-secret identifier matching letters/digits/dot/underscore/hyphen,1–64 characters. It defaults to unknown; no Git SHA/release is fabricated when the build operator did not supply it. System configuration reports only SMTP/storage/report-salt/MFA booleans, plus this explicit version and bounded export maximum. These flags establish configuration presence, not provider delivery or security health.

Counters are observable schema states: expiredPendingUploads counts assets.status=pending with expires_at<=database time; stuckDeletingUploads counts status=deleting with updated_at older than15 minutes. Neither proves an R2/network failure. failedUploadEvents is null/unavailable because no such event/status exists in the schema. Open reports include open/reviewing. Unresolved audit attempts are attempted rows older than15 minutes without succeeded/failed rows sharing requestId; they require reconciliation and do not establish mutation success/failure. No new upload-failure table or invented failure evidence.

## Current round4 operations — 2026-10-19

This checkpoint supersedes earlier phase availability statements. Implemented locally: P1 shared RBAC; native TOTP/per-operation password/reason/append-only audit; ordinary-target account/site actions; reports; directories; filtered activity/identifier CSV; system state counters; bilingual notices; P6 requests/verified-subject export/read-only staff/own sessions. ADMIN_CONSOLE20–22 records the email-search vulnerability, precise P6 controls and original-plan gaps. No round4 deployment, production connection, existing real role/key change or production migration has occurred. GitHub upload was later explicitly authorized and completed; see STATUS for actual remote evidence.

### First owner: documentation only, not executed
The earlier seven-step reviewed manual role-change procedure remains authoritative. There is no bootstrap CLI or automatic owner. Obtain separate authorization for an exact existing account/environment/current→requested role, independent review and rollback plan, arrange a real maintenance/drain window, execute one parameterized expected-current-role guarded transaction, separately review session revocation, verify one affected row and preserve a human access path. Reopen only after actual native enrollment/password/TOTP sign-in and allowed/denied checks. Do not edit factor flags to simulate proof. No real first-owner operation was performed in this work. Only newly created disposable local fixtures received synthetic roles and were removed afterward. Out-of-band database edits are not automatically application-audited.

### Data rights handling and export
Before live handling, the human must approve jurisdiction-specific deadlines, identity verification, delivery, deletion and retention procedures. DATA_REQUEST_DUE_DAYS defaults30, bounded1–365, as an operational placeholder only. Do not tell a requester this is a verified legal deadline. Changes affect new rows only.

1. Record the actual request/contact/type with the operator's reason/password under a TOTP-proven staff session. Keep credentials and unnecessary sensitive documents out of notes/reasons. Contact is stored for handling but ordinary DTOs mask it; the console does not send mail.
2. Move to in_progress. Establish the subject through an independent authenticated channel, using the approved case procedure. Record an evidence reference, exact account ID and its exact retyped confirmation through /subject; no automatic email lookup or contact-equality proof. It is a manual operator attestation; the application cannot authenticate external documents or legal authority. Staff/protected targets cannot use this ordinary-account workflow. Missing/deleted/unverified subjects cannot export. Binding is immutable; mistakes require rejection and a new reviewed request, not rebinding.
3. Owner may generate JSON only for a verified in_progress export request. Account fields: id/name/email/emailVerified/createdAt/updatedAt. Site fields: id/ownerId/slug/publishedReleaseId/createdAt/updatedAt. Received inquiry fields: id/siteId/name/email/message/status/createdAt/updatedAt. Received sender data is included as subject inbox content and must be considered in the approved delivery policy. No password/provider token/session/cookie/MFA/security record, draft, release snapshot, report/audit/request row, asset object key/byte, R2 file or backup. This subset is not a complete statutory access response. Other accounts' private content is excluded by stored ownership.
4. Default maximum1000 combined account/site/inquiry rows and1048576 UTF-8 JSON bytes; DATA_REQUEST_EXPORT_MAX_ROWS1–10000 and DATA_REQUEST_EXPORT_MAX_BYTES1024–10485760. Oversize413 aborts all output, with an attempted/failed pair when audit is available. There is no silent partial export or invented storage retrieval. Use a separately reviewed manual procedure for excluded/large data; do not raise limits blindly.
5. Download content is sensitive; deliver only through the approved independently verified channel, store minimal delivery evidence, and handle the temporary file under the approved retention rules. The application records generation, not delivery. Never commit the file. Export success auditing failure withholds bytes; reconcile the durable attempt before repeating. The request does not close automatically. Completed requires recorded verification plus closure evidence10–500; export completion additionally checks a succeeded generation audit. Neither the database status nor audit proves delivery or legal completeness.
6. Delete/correction requests track manual work. Follow the separately authorized account-removal procedure where applicable; native relational cascades remove account/site/inquiry/asset/report database records but do not erase R2 files, backups, prior signed links or downloaded copies. Complete only after actual reviewed work/evidence meets the approved procedure; otherwise leave in_progress or reject with real grounds. No automated storage erasure/cleanup/legal-completeness check exists. Subject account deletion sets user_id null while verification timestamp remains; exports fail safely afterward.

### Staff and own sessions
/staff and its matrix are read-only, staff.read owner only. Last activity is last recorded audit time, not last login or guaranteed complete activity. MFA boolean shows enrollment, not session proof. Grants for declared deferred capabilities are not implementation claims. Inventory is first1000 ID-ordered staff with explicit truncation. Role changes remain the documented manual procedure; no staff controls exist.

/admin/security uses native own-account setup and list/revoke session operations; revoke only other own sessions through the UI. Enrollment/challenge pages request no management data; recovery alone never grants console proof. Trusted devices remain denied; production cannot disable ADMIN_REQUIRE_MFA. Preserve required legacy/versioned encryption keys per the earlier rotation runbook. No real key change or backup restoration was executed here.

### Short incident response plan (reviewed procedure, not executed)
1. Triage from sanitized request IDs, action/target IDs, timestamps and actual outcomes. Distinguish configuration flags from provider health and unresolved attempts from confirmed failures. Preserve relevant audit evidence without updating/deleting historical rows; never copy cookies/passwords/TOTP material or exported subject files into tickets.
2. Scope the affected account/site/session and whether public output, contact inference, drafts or credentials could be involved. For account-email search inference before the round5 name-only fix, scope owner/support as well as analyst/moderator using available HTTP evidence. Round4 narrowed the affected roles but still let owner/support bypass audited revelation. Round5 removes email matching for every role. Ordinary searches wrote no reveal audit, so absence of reveal rows does not prove absence of inference. Do not invent a historical exposure count.
3. Obtain the required operational authority for containment. An authorized operator may use the existing scoped native session revocation/site suspension; real staff-role edits, traffic shutdowns, provider/secret changes and deployment remain separately reviewed actions. Do not enable native admin HTTP or weaken TOTP as an emergency shortcut.
4. Reconcile every indeterminate sensitive attempt against the actual target state before retrying. On audit outage keep sensitive work closed, repair persistence under approved operations and preserve failure evidence; do not insert fabricated outcomes. Native state/audit are separate failure boundaries; domain state/success writes roll back together.
5. Restore/test in an authorized isolated environment, retaining all necessary MFA encryption keys and verified backups. Recheck Origin/CORS, session revocation/TOTP, authoritative permissions, ownership, public-only rendering and the specific regression. Hosted recovery/provider/cookie behavior requires its own evidence; local tests alone do not prove restoration.
6. Record actual scope, actions, unresolved unknowns, reviewer and next follow-up in the protected incident record. Human/legal owners decide notification obligations and completion; this code does not determine them.

### Proposed retention policy — OPEN human decision
No automatic deletion, archive scheduler or purge job is authorized/implemented. Proposed review baseline only:180 days of searchable operational audit,90 days after closure for minimized request/report handling records,30 days after expiry for notices; archival/access/deletion exceptions, legal holds, backups, external logs and sender/subject rights require explicit human/legal confirmation. These durations are not active configuration or statutory guidance. The current system retains rows unless existing documented relational cascades or separately authorized operator actions remove them; actor/handler SET NULL is not strict byte immutability. Revisit inquiry/asset retention and protected evidence before launch. Do not present indefinite current storage as an approved policy.

### Rollout and known boundaries
0007_sour_earthquake.sql was generated by Drizzle and applied only through the root test guard to folio_test. Production rollout of0004–0007/settings has not been performed by this scope; inspect the real hosted migration ledger only under separate authorization. Review complete SQL and compatibility first; no schema push, reset or destructive down migration. Record the build identifier explicitly or accept truthful unknown. SMTP/R2 presence booleans are not live delivery checks.

failedUploadEvents stays null: no failure event/status is stored. expiredPendingUploads and stuckDeletingUploads are real distinct schema states; recent inquiry-volume time series and upload-failure telemetry are not implemented. Public notices refresh60 seconds plus network delay and remove known expiry locally; no portfolio banner. R2/backups erasure, complete legal export, internal notes, staff changes, private draft access, comprehensive retention/archive and physical-device/hosted-cookie/provider/remote-CI acceptance remain open as detailed in the original-plan mapping. The previously authorized friends trial does not authorize this round's deployment or upload.

Round4 verification/cleanup: final guarded local root57 pass/11 child-only skips/2961 assertions and enforced MFA child11 pass308; web27 pass596/typecheck/check351/default QA build25/25 plus dynamic routes exit0. Local Chromium final240 route cases/zero page errors across all four staff roles, both locales and320/1280. Owner exercised real request writes/export/native other-own-session revocation; other roles had page/denial coverage, not every mutation. Initial native rate-limit/download/waiting harness issues and actual narrow wrapping fixes are in CHANGELOG. Five fixture users and their sessions/audits plus two recorded requests were verified removed. Temporary factor/credential/download files removed; API/web/PostgreSQL ports verified closed. No new provider/physical-device/hosted-cookie/remote-CI/backup-restore acceptance. Human later authorized GitHub upload only; actual result belongs to STATUS and the final delivery, not a deployment claim.

## Round5 account search boundary — 2026-10-19
Account directory search is name-only for every staff role, including owner/support. Never use user.read_email to add an email predicate/filter/sort: full-email revelation retains the existing sensitive reason/password/TOTP/durable-audit operation. The current request/report/site administrative services contain no email matching/sorting lookup; public report duplicate suppression includes the submitted contact as part of its exact dedup tuple and remains unchanged. Do not describe the previous round4 role restriction as a complete fix. No historical inference count can be established from reveal audit rows alone. This round changes no deployment, provider configuration, data-rights workflow or operational policy.


## Database pool error capture — 2026-10-21

The safe event projection includes event/name/code/stage/ending/ended. Names and codes use finite allowlists; unknown is intentional, not evidence of a particular network condition. No messages, stack traces, SQL, parameters, client objects, URLs or user data are included. A local pg-cloudflare normal-close defect is fixed with the pinned Bun patch; see [investigation evidence](EVIDENCE.md#database-pool-error-investigation--2026-10-21). Do not lower severity or tune pools/deadlines based only on a name-only historical event.

Human-operated rollout, after reviewing/merging the PR (not executed by this task):

```sh
cd ~/Desktop/blog-website/work/github-upload
git switch main
git pull --ff-only origin main
bun install --frozen-lockfile
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bun --no-env-file x wrangler deploy --config apps/api/wrangler.toml
```

No migration, new secret, web deployment or provider provisioning is required. Existing Worker secrets are retained; do not reenter/print their values. Verify the target name foliocraft-api-trial before deployment.

Then capture only projected events; do not save or share the raw JSON tail, which may carry request headers/cookies. This pipeline outputs only the fixed safe fields and timestamp:

```sh
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bun --no-env-file x wrangler tail foliocraft-api-trial --config apps/api/wrangler.toml --format json |
  jq --unbuffered -c '. as $entry | .logs[]? | .message[]? | fromjson? | select(.event == "database_pool_error") | {timestamp: $entry.eventTimestamp, event, name, code, stage, ending, ended}'
```

Exercise normal sign-in/save/publish and one intended reset/upload operation through the existing UI; observe the normal scheduled run without triggering arbitrary maintenance on hosted data. Keep only the projected event, approximate operation/time and deployed version identifier. A real 57P01 with ending=false indicates server termination, not proof of Neon autosuspension; correlate provider lifecycle separately. Unknown/request/ended=true needs investigation if it recurs; the patch is not blanket error suppression. A quiet tail alone does not prove all hosted flows, TLS, mail or storage acceptance.

## Prepared owner monitoring — 2026-10-22

[MONITORING.md](MONITORING.md) is the operational source for Sentry project privacy/email configuration and UptimeRobot Free monitors. Probe only API `/health` and prerendered web `/en`, never `/ready` or a portfolio, to avoid keeping Neon compute awake. The source remains disabled without a valid Worker-secret DSN and actual version binding; provider account setup and hosted delivery remain unverified. No deployment, production migration or provider action has been executed for this scope.

## Optional Hyperdrive trial — 2026-10-22

Follow [HYPERDRIVE.md](HYPERDRIVE.md) for the separate unbound-code deployment, origin deadline and cache-disabled resource provisioning, optional binding deployment, measurement and rollback. Nothing is enabled/provisioned by this task. Keep DATABASE_URL for absence-only fallback; never run integration tests against Neon. The optional numeric database_timing projection shares the safe tail with database_pool_error. No Service Binding/web deployment is included.
