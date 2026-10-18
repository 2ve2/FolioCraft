# Operations and integrations

Last reviewed: 2026-10-15, Asia/Riyadh. This file describes current configuration and operational requirements that remain untested. Actual results are in `STATUS.md`; these instructions do not establish production readiness or mail delivery. Real local R2 evidence is recorded below and in STATUS.

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

`db:migrate` applies pending SQL to the **current DATABASE_URL**; verify its target before execution. It does not replace a backup or approval of a production upgrade. `db:generate` produces reviewable schema migration files; do not use `drizzle-kit push` or reset/truncate for operation.

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

Normal production: `requireEmailVerification=true`, send on registration/sign-in, and `autoSignInAfterVerification=false`. The human explicitly approved TRIAL_SKIP_EMAIL_VERIFICATION=true for this hosted friends trial; it suppresses the signup/sign-in verification requirement but does not simulate mail. Restore false and prove delivery before general launch. The frontend should prompt users to check their inbox after registration and sign in after verification; this required UI integration is not proven in production. Development permits the unverified local flow, which is not a launch policy.

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

This mode rejects every database except local `folio_test`, creates temporary `folio_restore_<random>`, runs `pg_restore --exit-on-error --no-owner`, compares eleven table counts plus temporary fixture Arabic profile/draft/release/published pointer, verifies `release_snapshot_immutable`, deletes **only its created temporary database**, and cleans the exact fixture user from the test source. Requires `createdb,pg_restore,psql,dropdb` and a test role permitted to create databases. This is limited structural evidence, not a substitute for restored sign-in/assets/snapshot tests. Record actual results in STATUS; the helper alone proves neither restoration nor a production backup. Official reference: [PostgreSQL SQL Dump](https://www.postgresql.org/docs/current/backup-dump.html).

## Logs, shutdown, and current limits

Structured request logs include request ID, method, status, and duration without body/cookies. Internal errors log error name, route, and DB code; clients receive a generic code. SIGINT/SIGTERM shutdown stops accepting requests and closes the pool, with a15-second forced-stop deadline; production rolling deployment is unproven.

Pending general-launch requirements: SMTP/sender domain and disabling the trial verification exception; live hosted R2 upload/decoder/rendering acceptance; comprehensive cookie, device and admin checks; multi-instance load/rate-limit measurement; monitoring/alerts and provider backup/restore; scheduled cleanup. Trial API/web HTTPS hosting and exact R2 trial CORS are configured, with the limited proof in CLOUDFLARE and STATUS. Environment or Docker configuration alone does not satisfy these conditions. This guide authorizes neither service purchases nor production deployment.


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
