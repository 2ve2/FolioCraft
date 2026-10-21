# Database pool error investigation — 2026-10-21

## Problem and scope

Historical API Worker events contain only event/name, so the hosted cause cannot be recovered from the supplied context. Started from fetched, fast-forwarded main at ba37ac6, branch codex/pool-error-diagnostics. Existing untracked docs/ADMIN_CONSOLE_TASK.md is unrelated and untouched. No actual secrets/env files were opened, copied or logged. The later human permission for Neon experiments was not exercised.

## Step 1: diagnostics and code trace

Added apps/api/src/db/pool-diagnostics.ts and tests/pool-diagnostics.test.ts, wired through db/index.ts and worker.ts. Only finite allowlisted names/codes, stage and actual pg ending/ended flags are emitted; unknown values become unknown. No arbitrary error serialization, getters, messages, stacks, SQL, parameters, clients or cause chains. Existing console.error severity is retained.

Trace findings:
- worker.fetch awaits app.fetch inside a new max:1 pool; finally ends it. There is no application fetch waitUntil handler or Better Auth advanced.backgroundTasks.handler.
- Cron places the entire withRequestDatabase operation, including maintenance and pool close, inside waitUntil. Its services await database and storage operations.
- Better Auth 1.7.7 create-context.runInBackgroundOrAwait awaits callbacks when the handler is absent. Installed password/sign-up/sign-in/email-verification routes await that helper. The only installed direct runInBackground caller found is the unused phone-number plugin. Project hooks await audit/MFA writes.
- Authentication mail awaits the selected transport. Storage consumes streams before completion/DB updates. Public assets redirect to a signed URL; there are no database-backed streamed HTTP bodies or detached application database callbacks.
- Publishing uses the existing Drizzle transaction/client; no transaction implementation changed.
- pg-pool 3.14.0 emits pool error from makeIdleListener after removing an idle client. Querying an ended pool rejects its query instead of itself emitting that event.

## Initial gates (diagnostics, before shutdown fix)

Commands run from the independent checkout, using Bun 1.4.2. The first sandbox attempts could not resolve github.com, create local TCP sockets, or use Bun temporary storage; escalated local/network retries succeeded. These are environment restrictions, not failing product gates. Local PostgreSQL 18.6 was initialized under work/pool-investigation/pg-data with trust authentication on loopback only and a fresh folio_test database. Migrations ran only through the guarded test wrapper.

```text
bun install --frozen-lockfile
Checked 402 installs across 516 packages (no changes) [39.00ms]; exit 0
bun audit
No vulnerabilities found (checked 456 packages) [902.00ms]; exit 0
bun run typecheck
Types generated successfully; both API/web typechecks exit 0
bun run check
Checked 394 files in 104ms. No fixes applied.; exit 0
bun run test:web
37 pass; 0 fail; 685 expect() calls; 15 files; exit 0
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55432/folio_test bun run test
69 pass; 12 skip; 0 fail; 5207 expect() calls; 26 files; exit 0
Enforced MFA child: 11 pass; 0 fail; 308 expect() calls
bun run test:worker-storage
8 Workers storage regressions passed; no provider/database requests.; exit 0
bun run test:worker-mail
15 Workers mail checks passed; all outbound traffic mocked, no real email/database/provider request.; exit 0
bun run build
Generating static pages (49/49); exit 0
bun run --cwd apps/web build:cloudflare
OpenNext build complete.; Worker saved in .open-next/worker.js; exit 0
(cd apps/api && bunx wrangler deploy --dry-run --outdir ../../work/api-dry-run)
Total Upload: 4658.74 KiB / gzip: 830.89 KiB; --dry-run: exiting now.; exit 0
```

The 12 conditional skips are unchanged: eleven MFA tests run in the enforced child; one historical browser-fixture cleanup test is conditional. No tests were disabled or quarantined. Build warnings: Next notices the parent package outside this Git root; OpenNext emits Node punycode deprecation; neither gate failed.

## Local runtime evidence before fix

Ignored reproduction material is under work/pool-investigation; no real provider credentials were used. Commands actually executed:

```sh
initdb -D work/pool-investigation/pg-data -U folio --auth=trust --no-locale --encoding=UTF8
pg_ctl -D work/pool-investigation/pg-data -l work/pool-investigation/postgres.log -o '-h 127.0.0.1 -p 55432 -k /tmp -c logging_collector=off' start
createdb -h 127.0.0.1 -p 55432 -U folio folio_test
python3 work/pool-investigation/prepare.py
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_SEND_METRICS=false WRANGLER_WRITE_LOGS=false bunx wrangler dev --config work/pool-investigation/api.json --local --ip 127.0.0.1 --port 8787 --test-scheduled
python3 work/pool-investigation/exercise.py
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_SEND_METRICS=false WRANGLER_WRITE_LOGS=false bunx wrangler dev --config work/pool-investigation/probe.json --local --ip 127.0.0.1 --port 8788
python3 work/pool-investigation/probe.py
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_SEND_METRICS=false WRANGLER_WRITE_LOGS=false bunx wrangler dev --config work/pool-investigation/trace.json --local --ip 127.0.0.1 --port 8789
```

- Real Worker HTTP: signup/signin, site creation, profile save, transactional publish and public read all 200. Upload intent returned truthful 503 STORAGE_UNAVAILABLE; reset request returned truthful 503 MAIL_UNAVAILABLE. These two provider-success paths were not verified in that dev server. Cron via /__scheduled returned 200 and maintenance_completed with storage disabled. Exact disposable account cleanup: DELETE 1.
- Eight normal flow pool errors occurred, with Error/unknown/request/ending:true/ended:true. The first probe-result parser incorrectly counted only lines beginning with JSON; Wrangler decorates error lines with ANSI prefixes. Direct inspection found those events, and subsequent parsing must extract the JSON payload, not use startsWith. No zero-event conclusion is drawn from the incorrect initial parser.
- Twelve concurrent request scopes held twelve distinct pg_backend_pid values. A deliberately delayed query after scope completion rejected as an ended-pool query; it did not reproduce the same asynchronous failure mechanism.
- pg_sleep(20) rejected at 15008 ms with SQLSTATE 57014, without an idle pool error from that query. No timeout setting was changed.
- pg_ctl -m fast stop while Worker request/scheduled-labelled probe pools and a Bun shared pool were idle produced 57P01 with ending:false/ended:false in all three stages. The scheduled-labelled probe uses the scope's stage argument; real Cron was tested separately above. API /ready returned 503 while stopped and 200 after restart.
- Three minimal traced Worker requests each succeeded, then called local socket.end(), then rejected the pending pg-cloudflare _listen read. A WeakSet matched the exact error object from that rejection to database_pool_error; each event had ending:true/ended:true. No error message or stack was printed. This proves the local normal-shutdown mechanism independently of user work, mail, deadlines or server interruption.

## Cause assessment and design

The reproduced normal-flow cause is pg-cloudflare 1.4.1 closing a Cloudflare socket while its reader still has a pending read. That rejection is forwarded as a socket error through pg to the pool idle-error listener even after pool.end. It is a fifth mechanism, outside the four original hypotheses. [Cloudflare TCP socket documentation](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/) states that close forcibly closes both streams; installed pg-cloudflare source calls socket.close without first settling its reader.

- (a) No post-response application database work found; deliberate ended-pool use has a different failure path. Not a universal proof against all future/background code.
- (b) Forced server termination is distinguishable (57P01, pool not ending). Neon suspension itself is not verified.
- (c) Local statement timeout is a query rejection with 57014. Real hosted connect/read failures remain unknown.
- (d) Bun can emit real shared-pool idle shutdown errors, but normal-end errors were reproduced in actual workerd, so they are not exclusively Bun logs.

Next step: cancel the reader after the final write completes and before intentional socket close, at the existing pinned adapter boundary, and prove normal close emits no pool error while unexpected disconnects remain visible. No suppression based solely on pool flags, size/deadline tuning, auth change or pooling across requests is justified. Historical hosted event attribution still needs post-deployment evidence.

## Not verified

No deployment, hosted tail, Neon access/migration, provider request/account change, real mail delivery/upload, hosted TLS behavior or browser UI verification. API runtime testing used HTTP clients and local workerd, not a browser. The local reproduction proves a mechanism but cannot classify every historical name-only hosted event.
