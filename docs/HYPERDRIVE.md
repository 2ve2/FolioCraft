# Optional Hyperdrive trial runbook

Prepared2026-10-22. **Nothing below was provisioned or deployed by this task.** There is no staging. The friends-only trial is the human-operated test environment. [Evidence, measurements and limits](evidence/2026-10-22-hyperdrive-latency.md).

## Decision and prerequisites

Local measurements show no reliable Hyperdrive gain: Miniflare's binding forwards directly to PostgreSQL and does not reproduce distributed origin pooling/TLS/Neon wakeup. This PR prepares an optional, inactive candidate. Enable it only as a reversible trial and keep it only if repeatable edge measurements justify the extra deadline-check query. The first two local Service Binding comparisons had equal medians; a final SCRAM run differed by1ms at coarse clock resolution. No repeatable edge/page-level gain is established; no Service Binding or production web routing change ships.

Existing pg8.23.1 and Node compatibility satisfy Cloudflare's driver requirements. No dependency, schema migration or web deployment is needed. Keep the existing `DATABASE_URL` Worker secret for automatic unbound fallback and Bun local operation. It must still be configured: environment validation intentionally retains the existing contract. It is also the fallback when the binding cannot be verified (see section 2). That decision is made before a request opens its database pool; a binding that fails mid-request does **not** retry a write through DATABASE_URL.

Free Hyperdrive includes100,000 statements/day (reset00:00UTC),10 configurations and approximately20 origin connections/configuration. The bound deadline check consumes one extra statement once per Worker isolate (and at most once a minute while it fails), not per request; transactions/auth can issue several statements per request. Watch usage, not just HTTP counts. Confirm the account's actual free capacity before proceeding; this guide authorizes no purchase/upgrade. [Pricing](https://developers.cloudflare.com/hyperdrive/platform/pricing/), [limits](https://developers.cloudflare.com/hyperdrive/platform/limits/), [driver](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/node-postgres/).

Never put a real connection string/password/token on a shell command line, in a tracked file, in chat or in a shared screenshot. Do not use shell tracing. Existing Workers Secrets are retained by normal deploy; do not print or reenter them. All commands below are for the human after review/merge, from the independent checkout.

## 1. Deploy code first, without a binding

Record the previous deployed API version privately using the dashboard, or the following version listing. Enter only that non-secret UUID at the prompt. Keep the current source manifest with every optional `[[hyperdrive]]` line commented and no Service Binding. If a live binding already exists unexpectedly, stop and reconcile it rather than treating this as an unbound rollout.

```sh
cd ~/Desktop/blog-website/work/github-upload
git switch main
git pull --ff-only origin main
bun install --frozen-lockfile
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bunx --no-install wrangler deployments list --config apps/api/wrangler.toml
read -r -p 'Previous deployed API version UUID: ' ICHNARA_PREVIOUS_API_VERSION
```

For the short measurement window, add `DB_TIMING_LOGS = "true"` **inside the existing `[vars]` table** of `apps/api/wrangler.toml`, retaining every other var. This flag logs only numeric timing/counters, fixed transport/stage and the API-generated request ID. It logs no SQL, values, path, user data or client address. Deploy the API only:

```sh
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bunx --no-install wrangler deploy --config apps/api/wrangler.toml
```

Run the public timing loop in section4, then sign in normally through the existing browser and load the studio to collect representative authenticated timing events. Never copy cookies into commands. Keep the same device/network, portfolio and operation mix before/after. A fresh deployment, Neon wakeup, cache state and geography can dominate small samples; record cold/warm runs separately. No readiness polling or automated hosted database tests.

**Rollback step1:** restore the saved deployed version. This returns to the prior code/configuration. No database or schema change has happened yet.

```sh
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bunx --no-install wrangler rollback "$ICHNARA_PREVIOUS_API_VERSION" --config apps/api/wrangler.toml
```

Afterwards observe the two existing UptimeRobot checks and optional Sentry errors, and use the safe tail below for `database_pool_error`. Liveness alone does not establish database health. Verify normal sign-in/studio and the existing published release through the UI.

## 2. Set the origin deadline, then create a cache-disabled configuration

Use Neon's **direct** PostgreSQL hostname (not the `-pooler` host) for Hyperdrive, keeping the same intended Ichnara database and API role. Do not reuse Sooqha resources or change the application's DATABASE_URL secret. [Cloudflare Neon guidance](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/neon/).

Hyperdrive transaction pooling resets session SET state. The bound path deliberately omits pg's startup `statement_timeout` and checks the origin default once per Worker isolate through a separate short-lived client. If the default is missing/zero/>15000ms, or Hyperdrive is unreachable, the request uses the bounded direct DATABASE_URL path instead, logs `{"event":"hyperdrive_unverified","reason":"statement_timeout"|"unavailable","fallback":"direct"}` and rechecks after 60 seconds. The site stays available; watch for that event, because UptimeRobot's `/health` does not touch the database; the current client read timeout remains16000ms and connection deadline remains20000ms. No whole-request transaction is added. Cloudflare's separate60s statement limit is insufficient for the application's15s guarantee. [Pooling behavior](https://developers.cloudflare.com/hyperdrive/concepts/connection-pooling/).

In the Neon SQL editor, select the **exact database and role used by the direct connection**. Verify current_user/current_database privately. Record the prior role/database statement_timeout override (including whether it is absent) and existing effective default for rollback. If the effective origin default is already positive and at most15s, preserve it. Otherwise run this non-schema configuration change **before creating Hyperdrive**, so no pre-existing pooled connections retain an old default:

```sql
SELECT current_user, current_database();
SELECT unnest(setconfig) AS previous_setting
FROM pg_db_role_setting
WHERE setdatabase = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND setrole = (SELECT oid FROM pg_roles WHERE rolname = current_user);

DO $$ BEGIN
  EXECUTE format('ALTER ROLE %I IN DATABASE %I SET statement_timeout = %L',
    current_user, current_database(), '15s');
END $$;
```

[PostgreSQL ALTER ROLE](https://www.postgresql.org/docs/current/sql-alterrole.html) applies these defaults only on a new login. Open a **fresh** connection as that role and confirm `SHOW statement_timeout;` returns15s (or the preserved tighter value). Do not rely on SET in the SQL editor's existing session. Role/default permissions or connection errors are a stop condition, not permission to weaken the guard.

**Recommended (simplest): create it in the Cloudflare dashboard.** Workers & Pages → Hyperdrive → Create configuration: name `ichnara-trial`, paste the direct connection string into the form (never into a terminal or chat), keep TLS required, and turn **caching off**. Copy the created id. Then continue at the caching verification below.

**CLI alternative:** the following is the exact `wrangler hyperdrive create ichnara-trial --connection-string … --caching-disabled --sslmode require` operation, with the URI passed through stdin and only placed into Wrangler's **in-process JavaScript argv**. It never enters OS argv/history, files or displayed CLI output. Only the created non-secret id is printed. Tested with a synthetic URI and Wrangler `--help` only; real creation is not verified. Requires Node22+ and existing Wrangler login; run `bunx --no-install wrangler login` separately if needed, without pasting a token. Do not run inside a terminal recorder. Do not add `--help` to the real command unless intentionally doing a no-create check.

```sh
set +x
read -r -s -p 'Ichnara direct PostgreSQL connection string (hidden): ' ICHNARA_ORIGIN_INPUT
printf '\n'
printf '%s' "$ICHNARA_ORIGIN_INPUT" |
  CI=true CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false node -e '
const fs = require("node:fs");
const input = fs.readFileSync(0, "utf8").trim();
let origin;
try { origin = new URL(input); } catch { process.exit(1); }
if (!["postgres:", "postgresql:"].includes(origin.protocol) || !origin.username || !origin.password || !origin.hostname || origin.pathname.length < 2) process.exit(1);
const cli = require.resolve("wrangler");
const write = process.stdout.write.bind(process.stdout);
let captured = "";
process.stdout.write = process.stderr.write = (chunk, encoding, callback) => {
  captured += String(chunk);
  if (typeof encoding === "function") encoding();
  if (typeof callback === "function") callback();
  return true;
};
process.on("exit", (code) => {
  const id = captured.match(/config: ([a-f0-9]{32})/);
  write(code === 0 && id ? `Hyperdrive id: ${id[1]}\n` : "No confirmed id captured. Check the dashboard privately before retrying; creation may have succeeded.\n");
});
process.argv = [process.execPath, cli, "hyperdrive", "create", "ichnara-trial", "--connection-string", input, "--caching-disabled", "--sslmode", "require", "--update-config=false", "--config", "apps/api/wrangler.toml", "--env-file", "/dev/null"];
require("node:module").runMain();
'
unset ICHNARA_ORIGIN_INPUT
```

The default Hyperdrive `require` mode encrypts and validates origin certificates using WebPKI; no TLS bypass is selected. A stricter existing custom-CA policy must be retained using the documented CA/verify-full configuration rather than downgraded. [TLS options](https://developers.cloudflare.com/hyperdrive/configuration/tls-ssl-certificates-for-hyperdrive/).

In the Cloudflare dashboard, inspect the created configuration and **verify query caching is disabled before binding**. If not disabled, use the following command and recheck; do not enable stale responses for sessions, ownership/publication pointers or public snapshots. The runtime binding cannot inspect the remote caching setting. Do not run raw configuration output through chat/logging tools.

```sh
read -r -p 'Created Hyperdrive id: ' ICHNARA_HYPERDRIVE_ID
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bunx --no-install wrangler hyperdrive update "$ICHNARA_HYPERDRIVE_ID" --caching-disabled --config apps/api/wrangler.toml
```

The update is needed only if the disabled state was not already verified. Caching is a resource setting, not a Wrangler binding property; a local binding test cannot certify it. [Query caching](https://developers.cloudflare.com/hyperdrive/concepts/query-caching/), [Wrangler commands](https://developers.cloudflare.com/hyperdrive/reference/wrangler-commands/).

**Rollback step2:** while still unbound, the application continues using DATABASE_URL. An unused new Hyperdrive configuration can be deleted using its exact saved id. If no role/database override existed before, restore inherited state with the SQL below **only after no Hyperdrive client uses it**. If an override existed, restore its exact recorded value with the same formatted ALTER ROLE command instead of resetting it. Never reset a pre-existing policy blindly.

```sh
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bunx --no-install wrangler hyperdrive delete "$ICHNARA_HYPERDRIVE_ID" --config apps/api/wrangler.toml
```

```sql
-- Only when the recorded role/database override was absent:
DO $$ BEGIN
  EXECUTE format('ALTER ROLE %I IN DATABASE %I RESET statement_timeout',
    current_user, current_database());
END $$;
```

No database tables/data/migrations are changed by either configuration step. Observe normal UI operations and the same monitoring/tail signals afterwards.

## 3. Bind as a separate deployment; retain only after measurements

Uncomment the three optional Hyperdrive lines in `apps/api/wrangler.toml`, replacing the placeholder with the human-created id. Keep them **outside** `[vars]` and before it, as the committed comments show:

```toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "<the-created-32-character-id>"
```

Keep DATABASE_URL and every other secret/var. Deploy only the API again:

```sh
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bunx --no-install wrangler deploy --config apps/api/wrangler.toml
```

Repeat section4 using the same endpoints/normal browser actions and sample count. Logs must report `transport:"hyperdrive"` for bound work, positive connection/query counts and no query errors; the guard read happens only on the first request of each isolate. Compare warm median/p95 and error rates across several batches, retaining separate cold-Neon results. Keep activation only if the gain repeats beyond run-to-run noise with acceptable p95 and no functional regression. Local measurements provide no threshold guarantee.

Through normal UI, confirm the existing published release, private draft separation, session sign-in/sign-out, ownership denials, and an owner-approved publication/unpublication change if desired. Do not run the integration suite against the trial or change another person's portfolio. Observe the next ordinary Cron run; do not trigger arbitrary hosted maintenance.

**Rollback step3:** comment/remove **all three** `[[hyperdrive]]` binding lines, leaving the rest of the manifest untouched, then rerun the exact API deploy command above. No code revert is needed: absent binding automatically uses existing DATABASE_URL. Verify `transport:"direct"` and normal UI behavior. A `hyperdrive_unverified` event while bound means the binding is configured but the site is already running on the direct path; fix the origin default or remove the binding. Remove the binding/deploy successfully **before** deleting its resource or restoring the origin default. If the deployment itself is broken, the saved pre-task version rollback in step1 is an alternative. Watch UptimeRobot, optional Sentry and database_pool_error after either path.

When measurement finishes, remove `DB_TIMING_LOGS` (or set it to `"false"`) from `[vars]` and deploy the API once more. Removing telemetry does not change the connection path. Its rollback is adding `"true"` and redeploying if further measurements are needed. Keep only the safe projections/numeric aggregates, not raw tails or private responses.

## 4. Public trial measurements and safe tail

This bounded loop makes public reads only. It creates no account and saves no response bodies/cookies. Run the same loop before and after binding; enter a currently published slug, e.g. the existing trial's `lordhhh`. `connect_s`/`tls_s` belong to curl-to-Cloudflare, while database_timing measures Worker-to-database; do not confuse them. Anonymous `/api/me` is401 without a session and does not replace an authenticated session sample; use normal browser requests with generated request IDs for that comparison.

```sh
read -r -p 'Existing published portfolio slug: ' ICHNARA_PUBLIC_SLUG
for ICHNARA_TARGET in \
  "https://api.lord2ve.tech/api/public/sites/$ICHNARA_PUBLIC_SLUG" \
  "https://lord2ve.tech/p/$ICHNARA_PUBLIC_SLUG"; do
  for ICHNARA_SAMPLE in $(seq 1 30); do
    curl --silent --show-error --max-time 30 --output /dev/null \
      --write-out "sample=$ICHNARA_SAMPLE status=%{http_code} connect_s=%{time_connect} tls_s=%{time_appconnect} ttfb_s=%{time_starttransfer} total_s=%{time_total}\n" \
      "$ICHNARA_TARGET"
  done
done
```

Record which target each30-line batch belongs to, deployed version, time/network and whether Neon was cold. Exclude failures from latency percentiles but report their counts; never describe a fast404/500 as successful performance. Use the API response's generated `X-Request-Id` visible in browser network tools to match normal session/studio operations.

Do not save/share raw Wrangler tail output; it can include request headers/cookies. This jq pipeline prints only allowlisted database event fields. It retains real pool errors and does not lower their severity:

```sh
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bunx --no-install wrangler tail foliocraft-api-trial --config apps/api/wrangler.toml --format json |
  jq --unbuffered -c '. as $entry | .logs[]? | .message[]? | fromjson? | if .event == "database_timing" then {timestamp: $entry.eventTimestamp, event, transport, stage, requestId, connections, connectionMs, queries, queryMs, queryErrors, durationMs} elif .event == "database_pool_error" then {timestamp: $entry.eventTimestamp, event, name, code, stage, ending, ended} else empty end'
```

Watch UptimeRobot's existing API `/health` and web `/en` monitors (do not replace them with DB-backed pages); inspect Sentry errors if it has actually been configured. Watch pool errors, 5xx, deadline rejections, rising p95, origin connections and Hyperdrive Free query usage. Neither a quiet tail nor liveness proves publication/session correctness. See [monitoring runbook](MONITORING.md) and [pool diagnostics](OPERATIONS.md#database-pool-error-capture--2026-10-21).

## Local reproduction and Service Binding disposition

With an independently prepared disposable local folio_test and frozen dependencies, run these sequentially. The guarded suite owns local migrations; neither benchmark runs migrations or accepts a hosted/query-overridden URL. Use a source-only copy if local environment files exist.

```sh
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55434/folio_test bun --no-env-file run test
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55434/folio_test bun --no-env-file scripts/measure-worker-database.ts --label=unbound
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55434/folio_test bun --no-env-file scripts/measure-worker-database.ts --label=bound --binding
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55434/folio_test bun --no-env-file scripts/measure-service-binding.ts
```

The local native binding needs a synthetic password under Miniflare even with loopback trust authentication; the harness supplies one without logging it. The origin-default helper changes/restores only the caller role's folio_test deadline in finally. Use a disposable role allowed to modify its own settings, run no concurrent database suites, and verify restoration after an interrupted run.

Service Binding is not installed; rollback is therefore **none**. The test-only caller is never deployed, and all production web SSR continues public-URL fallback. If future edge measurements justify a web binding, it needs its own optional path, public-fetch/no-cookie policy and verified client-IP trust design. Cloudflare's same-zone Worker header behavior cannot justify trusting caller-supplied IP headers. This task adds no spoofable caller header, secret or bypass.
