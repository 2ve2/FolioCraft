# Optional Hyperdrive latency evaluation — 2026-10-22

## Problem, starting point and boundaries

Task: measure connection/query cost before changing the trial API; prepare optional cache-disabled Hyperdrive and evaluate web-to-API Service Binding only if measurements warrant it. Fetched and fast-forwarded main to `3f85e37`; branch `codex/hyperdrive-latency`. The independent checkout is the only edited/committed working copy. Unrelated untracked `docs/ADMIN_CONSOLE_TASK.md` is preserved and excluded. No subagents.

Read the startup/architecture/operations/source/decision notes and Task 1 pool investigation before implementation. Task 1 proved a local pg-cloudflare normal-close bug, not every historical hosted event. Its graceful-close patch, real-error severity, per-request isolation and transactional driver are retained.

No deployment, provider resource/account change, Neon query/migration, secret inspection/copy, external mail/storage request or staging operation. The human cancelled staging. All application/database runtime checks use disposable loopback PostgreSQL 18.6 `folio_test:55434`. Synthetic credentials remain inside the harness processes; reports contain no credentials/cookies/native signup bodies. Source-only builds exclude environment files and have physically local frozen dependencies.

## Design and source

- `apps/api/src/db/hyperdrive.ts`: optional structural binding/config selector. Absent binding returns an empty override. Bound requests use its connection string; no retry/failover to a second database on bound errors. Origin connections stay request-local/max1 and close in finally; Hyperdrive owns remote pooling.
- Bound mode omits the startup `statement_timeout`, which is session state under transaction pooling. Each new client checks the origin role/database default through `pg_settings`; zero, missing or a deadline above `DB_STATEMENT_TIMEOUT_MS` fails closed before business queries. Keep the server default at or below15s; preserve the independent16s client read deadline. This adds one read per connected bound request, counted in timing/quota evidence. It is not a per-query transaction wrapper.
- Existing publication transactions remain unchanged: Drizzle uses one acquired client and PostgreSQL transactions/locks. No schema, dependency, isolation-default, CORS, session, ownership or public cache change. No new browser-facing strings.
- `apps/api/src/db/timing.ts`, `db/index.ts`, `worker.ts`: opt-in `DB_TIMING_LOGS="true"`, request-local connect/query counters and durations. Correlation comes from the generated response request ID, never an incoming correlation header. Only fixed metadata/numbers are logged, without SQL/parameters/results/paths/addresses/cookies/credentials. Disabled by default. Successful connections are counted; failed setup is not a successful connection sample. Query duration includes wire/driver/queue time, not a database CPU profile. Workers clocks are coarse and advance with I/O; rounded local samples are expected.
- Worker HTTP and Cron both receive the optional binding. Bun's shared pool and unbound request configuration retain their existing values. Liveness still opens no connection.
- `apps/api/tests/hyperdrive.integration.test.ts`: absent binding, rejected origin deadlines, native publication/draft isolation/unpublish, explicit same-backend serializable transaction with release+pointer rollback, server cancellation57014 and reusable client, pg timing promise/callback/error behavior. Startup options in this Bun test emulate an origin default; they are not evidence of a hosted pooler.
- `scripts/test-worker-database.ts`, its fixture and `scripts/test-api.ts`: run the existing seven actual workerd checks in both modes. Bound mode has a deliberately unreachable fallback DATABASE_URL, proving selection for request and actual Cron.12 concurrent scopes remain isolated and real57P01 remains observable. Root/Worker URL guards now also reject protocol/query/hash overrides.
- `scripts/local-statement-timeout.ts`: local-only helper temporarily sets the caller's role/database deadline in disposable folio_test and restores the exact prior override (or inherited state) in finally. Miniflare strips URL startup options from native Hyperdrive bindings, so setting an actual local origin default is necessary. No hosted input is accepted. Run database harnesses sequentially.
- `scripts/measure-worker-database.ts`: native synthetic account/site/publication,35 cycles per endpoint, first5 warmups excluded,30 correlated successful samples, numeric-only JSON, exact-account cleanup. `scripts/measure-service-binding.ts`:30 alternating workerd subrequests via local HTTP versus a native Service Binding to the same real API; test-only caller never enters the deployed web/API.
- `apps/api/wrangler.toml` has comments only for the optional binding; no active Hyperdrive/Service Binding or timing flag, id or secret. Manual runbook is a separate documentation step.

## Official research (checked this session)

- [Pricing](https://developers.cloudflare.com/hyperdrive/platform/pricing/): Free includes100,000 database statements/day; excess fails and counters reset00:00UTC. Queries include reads/writes/schema statements, not just HTTP requests. No plan upgrade is part of this task.
- [Limits](https://developers.cloudflare.com/hyperdrive/platform/limits/): Free10 configurations/account, approximately20 origin connections/configuration,15s initial origin-connect deadline,10-minute idle deadline and60s maximum statement duration. Application deadlines remain tighter.
- [pg driver](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/node-postgres/): minimum8.16.3 with Node compatibility. Existing exact pg8.23.1 and nodejs_compat satisfy this; no added dependency.
- [Connection pooling](https://developers.cloudflare.com/hyperdrive/concepts/connection-pooling/): backend connection is pinned for a transaction; SET state resets when returned. Do not depend on session SET across separate transactions or wrap the entire HTTP request in a transaction to preserve settings.
- [Neon](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/neon/): use the direct PostgreSQL hostname, not an additional Neon pooler/serverless HTTP driver.
- [Caching](https://developers.cloudflare.com/hyperdrive/concepts/query-caching/) and [commands](https://developers.cloudflare.com/hyperdrive/reference/wrangler-commands/): caching is a resource setting, enabled by default unless explicitly disabled. Writes do not invalidate cached reads. The runbook requires `--caching-disabled` and dashboard verification before binding; runtime cannot inspect this remote setting. No query is approved for caching.
- [TLS](https://developers.cloudflare.com/hyperdrive/configuration/tls-ssl-certificates-for-hyperdrive/): default `require` encrypts and validates origin certificates with WebPKI; custom CA/verify-full requires explicit certificate configuration. No verification bypass is added.

## Actual measurement commands and results

```sh
initdb -D work/hyperdrive-latency/pg-data -U folio --auth=trust --no-locale --encoding=UTF8
pg_ctl -D work/hyperdrive-latency/pg-data -l work/hyperdrive-latency/postgres.log -o '-h 127.0.0.1 -p 55434 -k /tmp -c logging_collector=off' start
createdb -h 127.0.0.1 -p 55434 -U folio folio_test
# From the source-only build, with no provider environment:
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55434/folio_test bun --no-env-file run test
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55434/folio_test bun --no-env-file scripts/measure-worker-database.ts --label=baseline
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55434/folio_test bun --no-env-file scripts/measure-worker-database.ts --label=after-unbound
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55434/folio_test bun --no-env-file scripts/measure-worker-database.ts --label=after-binding --binding
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55434/folio_test bun --no-env-file scripts/measure-service-binding.ts
```

The baseline is main plus timing instrumentation only, before adding the binding selector. Baseline API75/0, native MFA11/0, workerd7/7. Each latency run removed exactly1 synthetic account. Baseline local API wall time median/p95, milliseconds:

- Public:5.87/7.38; connection2/4; queries2/3,1 statement.
- Session (`/api/me`, valid synthetic native session):7.21/9.00; connection2/3; queries2/3,4 statements.
- Studio owned draft:6.79/9.57; connection2/3; queries2/4,3 statements.

After implementation, unbound:

- Public:7.08/11.99; connection3/5; queries2/4,1 statement.
- Session:9.71/13.06; connection3/4; queries3/5,4 statements.
- Studio:8.55/12.85; connection3/4; queries3/4,3 statements.

After implementation, native local Hyperdrive binding forwarding to the same local PostgreSQL (NOT actual Hyperdrive origin pooling/TLS):

- Public:6.95/11.88; connection3/4; queries3/6,2 statements.
- Session:9.89/14.89; connection2/4; queries4/5,5 statements.
- Studio:7.85/13.81; connection2/4; queries3/7,4 statements.

These successive small loopback runs do not show a reliable latency gain. The unchanged unbound statement counts and variable connection time show that these are noisy local measurements, not proof of an application speedup/regression. Bound mode costs one additional deadline-verification query. Native local binding coverage does not emulate distributed pooling, TLS setup or Neon wakeup. **Actual before/after Hyperdrive edge latency: not verified.** The optional candidate is prepared but inactive; enable/retain it only after the human's trial comparison shows a repeatable benefit with correct public/session behavior.

Initial Service Binding comparison,30 interleaved samples: local HTTP median6ms/p9511ms; binding median6ms/p9510ms. This is API subrequest time including database work, not Next page render or public-internet edge routing. The median gain is0ms; no Service Binding is shipped. The committed repeatable harness was then run again: HTTP7/11ms and binding7/11ms median/p95, again0ms median gain;1 exact account removed. Current public SSR continues its URL fetch with no session forwarding. Client IP handling is untouched. Hosted routing cost remains unknown; measure it before proposing a new trusted caller/IP boundary.

Ignored numeric evidence: `work/hyperdrive-latency/build/work/database-latency/*.json`; baseline/implementation logs and gate summaries are under `work/hyperdrive-latency/`. Synthetic transport verification used Node/Wrangler help only: `Safe stdin + in-memory Wrangler argv help verified; no provisioning.` It verified absence of the synthetic URI from OS argv; no real credential was supplied.

## Implementation gates

All commands ran in the isolated source-only copy, with Bun1.4.2, no .env/provider configuration and loopback folio_test only. Real result lines:

```text
bun install --frozen-lockfile
Checked 448 installs across 601 packages (no changes); exit0
bun audit
No vulnerabilities found (checked 539 packages); exit0
bun run typecheck
API/web/E2E TypeScript and Next type generation; exit0
bun run check
Checked 425 files. No fixes applied.; exit0
bun run test:web
37 pass; 0 fail; 685 expect() calls; exit0
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55434/folio_test bun run test
79 pass; 12 conditional skips; 0 fail; 5297 expect() calls
Native MFA child:11 pass; 0 fail; 308 expect() calls
Workers database:7/7 unbound +7/7 local binding; exit0
bun run test:worker-storage
8 Workers storage regressions passed; no provider/database requests.; exit0
bun run test:worker-mail
15 Workers mail checks passed; all outbound traffic mocked; exit0
bun run build
Generating static pages (50/50); exit0
bun run --cwd apps/web build:cloudflare
Generating static pages (50/50); OpenNext build complete.; exit0
(cd apps/api && bunx wrangler deploy --dry-run --outdir ../../work/api-dry-run)
Total Upload:5134.08 KiB / gzip:939.14 KiB; --dry-run: exiting now.; exit0
bun run test:worker-monitoring --web-built
28 Workers monitoring checks passed; all ingestion mocked; exit0
```

The12 skips are unchanged conditional MFA/old browser-cleanup cases; the11 MFA tests execute in the enforced child. No skipped/disabled/quarantined test was introduced. First local startup hit sandbox socket denial; authorized retry succeeded. Initial implementation harness failures (Miniflare requiring a synthetic password and discarding URL startup options) were corrected, not attributed to main; no product gate failure is labelled pre-existing. The first ignored gate runner had an unsupported output-capture option and was corrected before gates ran.

## Remaining work and verification limits

Manual rollout/rollback runbook, final documentation commit and PR are pending in this implementation checkpoint. Hosted provisioning, caching-disabled configuration, real Hyperdrive transaction/reset behavior, origin TLS, Neon autosuspension, trial before/after timing, alert delivery and hosted cookies are not verified. Browser UI was not changed or tested by this step; runtime evidence is actual local HTTP/workerd. No schema migration or web deployment is required for this API-only optional candidate. No enabled Service Binding exists to roll back.

## Operational handoff verification

Implementation committed in `ae1749f` (`feat(api): add optional Hyperdrive path`). Added HYPERDRIVE.md with absent-binding deployment first, exact stdin/in-process-argv Wrangler provisioning with caching disabled, origin role/database deadline preservation and restoration, separate binding enable/rollback, bounded public curl and safe projected timing/pool tail. No URI/password reaches OS argv/history/log files or displayed Wrangler output in that procedure. The exact documentation snippet parsed/executed with a synthetic URI and an added --help flag, exit0; it correctly captured no resource id because no create was performed. No provider success is inferred. Operations/Cloudflare/README/source map link to the runbook. Final documentation-step gates and PR/cleanup results follow when complete.

Final review found a CI-only harness issue before handoff: the native local-binding setup unconditionally replaced a supplied test password with the no-password/trust placeholder. Both harnesses now synthesize a password only when one is absent. The disposable local cluster was switched to SCRAM with a synthetic CI-only password; both IPv4 pg_hba entries were checked as scram-sha-256. The full gate run is being repeated against password-authenticated folio_test. Production connection/authentication code is unchanged.

[Initial PR7 run39708626819](https://github.com/2ve2/FolioCraft/actions/runs/39708626819) independently reproduced the harness defect: integration passed the unbound workerd checks, then the bound path returned500 with password authentication failure. Validate/workers succeeded. Logs were inspected through boolean/error-code projections only, not copied or displayed as raw CI output. This is a new branch defect, not a failure attributed to main.

## Final acceptance, remote checks and cleanup

Password fixture correction committed as `194d189` (`fix(test): preserve database fixture passwords`). All eleven required gates plus mocked monitoring passed again against actual local SCRAM authentication before the correction commit, then all were repeated before the documentation handoff. Final acceptance has14/14 successful commands (the eleven gates, monitoring and two benchmark checks). Outputs/counts match the implementation gate block above:448 installs/601 packages, audit539, Biome425, API79 pass/12 unchanged conditional skips/0 fail/5297 assertions, MFA11/0/308, web37/0/685, workerd database14/14, storage8/8, mail15/15, Next/OpenNext50/50, API5134.08KiB/gzip939.14KiB, monitoring28/28. All exit0. `git diff --check` and English-only edited-Markdown scan also pass. Twelve implementation files match the tested build copy byte-for-byte.

The final bound benchmark was also repeated with a supplied SCRAM password:30 successful samples each, public8.45/15.28ms, session11.17/18.18ms, studio9.11/16.83ms median/p95; connections4ms median and7ms p95, query3/6ms for all,2/5/4 statements respectively. These are password-path acceptance samples, not a comparison against the earlier trust-authentication baseline. The third Service Binding run reports HTTP8/9ms versus binding7/7ms; a1ms coarse-clock median difference after two0ms differences does not establish repeatable real edge/page benefit. Both exact fixture accounts were removed (1 per benchmark). No production binding is justified by these local runs.

[Corrected PR7 CI run39709019010](https://github.com/2ve2/FolioCraft/actions/runs/39709019010) on194d189 completed successfully for validate, workers, integration and e2e. The actual Chromium job reports43 passed. Initial integration failure is retained above; it is not labelled pre-existing. This is remote CI on disposable PostgreSQL/mocked providers, not a hosted-trial database test. The final documentation-only commit will trigger its own checks; those are not preclaimed successful here.

[PR7](https://github.com/2ve2/FolioCraft/pull/7) is open against main and attached to this chat; no merge. `HYPERDRIVE.md` and README/Cloudflare/operations/source-map links complete the manual handoff. No provider command, deployment, new secret, hosted migration or Service Binding was executed. Exact human commands and all rollback steps are in the runbook; no schema migration or web deployment is required.

Final local cleanup:0 generated latency accounts remain,0 role/database statement_timeout overrides remain (the inherited prior state), owned PostgreSQL stopped normally, port55434 closed. Miniflare instances dispose in finally; no persistent API/web process was started by these benchmarks. Unrelated untracked docs/ADMIN_CONSOLE_TASK.md is preserved. Active source work:none; local blockers:none. Next action:human review and only then the optional measured trial procedure. Real Hyperdrive pooling/reset/TLS/query-caching configuration, edge improvement, Neon wakeup and hosted session/publication behavior remain not verified; no new manual device/browser/provider acceptance is inferred from CI.
