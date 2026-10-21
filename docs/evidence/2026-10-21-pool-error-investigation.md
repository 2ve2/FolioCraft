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

The initial proposed reader-cancellation approach was subsequently tested and rejected; the final design and its actual results follow below. No suppression based solely on pool flags, size/deadline tuning, auth change or pooling across requests is justified. Historical hosted event attribution still needs post-deployment evidence.

## Not verified

No deployment, hosted tail, Neon access/migration, provider request/account change, real mail delivery/upload, hosted TLS behavior or browser UI verification. API runtime testing used HTTP clients and local workerd, not a browser. The local reproduction proves a mechanism but cannot classify every historical name-only hosted event.


## Step 2: proven local shutdown fix

`bun info pg-cloudflare` returned latest 1.4.1, published 2026-09-30T15:38:46.171Z by the node-postgres maintainer. No new dependency or version upgrade was introduced. `bun patch pg-cloudflare@1.4.1` and `bun patch --commit node_modules/pg-cloudflare` produced the committed source/distribution patch and lockfile registration. An unrelated generated Bun marker was removed from the patch; the frozen install and final suite verify the final patch.

The fix uses writable.close() for normal end(), after the existing final-write callback, instead of forcibly aborting both streams with socket.close(). destroy() retains socket.close(). Errors are still forwarded by the existing catches. There is no lifecycle/severity-based error suppression, reconnect/retry, shared Worker connection, deadline/size change, schema migration, auth change or TLS setting change. Bun retains pg's existing Node socket implementation.

New files: patches/pg-cloudflare@1.4.1.patch, scripts/test-worker-database.ts, apps/api/tests/fixtures/worker-database.ts. Modified: package.json, bun.lock, scripts/test-api.ts and continuity/operations documentation. The test-only routes are not mounted by the application. The root guarded wrapper runs the workerd checks after the Bun suite; browser fixture modes retain their existing lifecycle. The script independently rejects remote/non-folio_test URLs before bundling/connecting.

### Regression proof and rejected experiment

```text
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55432/folio_test bun run test
Before patch: Bun 69 pass / 12 skip / 0 fail; workerd assertion fails:
AssertionError: Successful request teardown must not emit a pool error
1 !== 0
exit 1
Reader-cancellation experiment: the same assertion still failed; exit 1.
That candidate was discarded, not committed as a solution.
Graceful writable-close patch: Bun 69 pass / 12 skip / 0 fail / 5207 assertions;
7 Workers database checks passed; local folio_test only; 12 concurrent clients isolated; real idle termination retained.
exit 0
```

The seven Worker checks cover: normal request close, same-client transaction, reusable connection after rollback, twelve distinct concurrent backends with clean close, actual scheduled handler/maintenance close, own-idle-backend termination preserving 57P01 while ending/ended are false, and clean recovery in a new request. Logs are captured by Miniflare and parsed from fixed JSON payloads, including decorated output. No error is suppressed by the harness.

The before assertion was added specifically to expose the reproduced defect; no existing failing gate was labelled pre-existing. The first diagnostic commit had passed every existing gate.

### Repeated actual API runtime

A fresh wrangler dev --local --test-scheduled server on port 8790 used the final patch and the same isolated database. `python3 work/pool-investigation/exercise-after.py` repeated the ten HTTP cases. Signup/signin/create/save/publish/public/health were 200; disabled upload intent and reset returned their real 503 codes; Cron returned 200/maintenance_completed. Pool events dropped from eight before the fix to zero after the fix. Both exact disposable accounts were cleaned (DELETE 1 per flow); no credentials/cookies/native auth bodies were printed or persisted by the HTTP harness. A local pg_stat_activity count after the flow found zero other client connections to folio_test. Existing Workers mail regressions separately prove callbacks await a mocked provider; this is not real provider delivery.

### Final gates

All eleven final gates ran after the final patch, with a clean process environment (no provider credentials) and no local env files. Full local logs: work/pool-investigation/final-*.log; structured exit results: final-gates.json. Exact result lines:

```text
bun install --frozen-lockfile
1 package installed [13.00ms]; exit 0 (final patch applied)
bun audit
No vulnerabilities found (checked 456 packages) [1.61s]; exit 0
bun run typecheck
Types generated successfully; both API/web typechecks exit 0
bun run check
Checked 396 files in 96ms. No fixes applied.; exit 0
bun run test:web
37 pass; 0 fail; 685 expect() calls; exit 0
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55432/folio_test bun run test
69 pass; 12 skip; 0 fail; 5207 expect() calls
Enforced MFA child: 11 pass; 0 fail; 308 expect() calls
7 Workers database checks passed; local folio_test only; 12 concurrent clients isolated; real idle termination retained.
exit 0
bun run test:worker-storage
8 Workers storage regressions passed; no provider/database requests.; exit 0
bun run test:worker-mail
15 Workers mail checks passed; all outbound traffic mocked, no real email/database/provider request.; exit 0
bun run build
Generating static pages (49/49); exit 0
bun run --cwd apps/web build:cloudflare
Generating static pages (49/49); OpenNext build complete.; exit 0
(cd apps/api && bunx wrangler deploy --dry-run --outdir ../../work/api-dry-run)
Total Upload: 4658.78 KiB / gzip: 830.90 KiB; --dry-run: exiting now.; exit 0
```

The API dry-run bundle contains the final this.destroyed ? socket.close() : this._cfWriter.close() branch. Existing conditional skips and benign build warnings are described above. Final documentation-only edits received a fresh Biome and git diff whitespace check before commit; no source changed after the full run.

Cleanup: all four local Wrangler dev servers were stopped; no pool-probe fixture users remained; PostgreSQL was stopped normally. Ports 55432/8787/8788/8789/8790 were verified closed. The ignored local data/logs remain inside work, not in Git.

## Human rollout and capture

The exact ordered API-only deployment and metadata-only tail commands are in [OPERATIONS.md, database pool error capture](../OPERATIONS.md#database-pool-error-capture--2026-10-21). They are instructions for the human, not executed deployment evidence. No migration, new secret, provider provisioning or web deployment is required. All current real secrets remain untouched. The tail filter outputs only timestamp/event/name/code/stage/ending/ended, not raw Worker tail metadata. Keep approximate operation/time and deployed version with any recurrence; do not infer Neon suspension from a 57P01 alone.

## Remaining limits

Hosted historical events remain unclassified because their old payload had no code/stage/lifecycle. This fixes a directly reproduced normal-shutdown defect, not a claim that every historical occurrence had that cause. Neon autosuspend/TLS and provider/runtime behavior are not verified. Local database TLS negotiation was not exercised; the shared adapter end path changed, while TLS handshake/verification settings did not. The version-specific patch needs review on upgrades. No post-response application DB operation was found, but future detached work still must retain its scope. No browser UI test, actual email/R2 request, deployment or hosted tail was performed.
