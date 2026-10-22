# Owner monitoring — 2026-10-21/22

## Problem and authorized scope

The two trial Workers emit some sanitized events but have no established owner alerting. Add privacy-preserving error capture for both Workers, HTTP 5xx, Cron outcomes and release identifiers, plus externally operated uptime alerts. The human explicitly cancelled staging; no staging changes are part of this branch.

Branch: `codex/owner-monitoring`, based on freshly fetched `main` at `97bfd30`. Work is confined to the independent checkout. The pre-existing untracked `docs/ADMIN_CONSOLE_TASK.md` is excluded.

## Provider comparison (official sources checked 2026-10-21)

- **Cloudflare Workers Logs / Observability:** currently included on Free with 200,000 log events/day and three-day retention; Paid includes 20 million/month and seven days, then $0.60/million. Native structured console logs, runtime exceptions and invocation outcomes; low setup effort and no new SDK. Automatic invocation metadata includes request URLs, so simply enabling it does not meet the privacy requirement. Disable invocation logs and audit emitted fields before retention/export. Logs configuration alone does not establish delivery of an owner alert for every application failure. On December 1, 2026 Cloudflare changes to shared Observability pricing: Free includes 0.5 GB/day with seven-day retention and no additional ingestion option. Recheck before rollout. Sources: [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/), [new pricing](https://developers.cloudflare.com/observability/pricing/), [available notifications](https://developers.cloudflare.com/notifications/notification-available/).
- **Workers Logpush:** Workers Paid only (minimum Workers subscription $5/month); 10 million requests/month included, then $0.05/million, plus destination charges. Exports invocation/request metadata, logs and exceptions; requires a destination and separate alert configuration. Higher setup and privacy burden; not recommended for this friends trial. Source: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Logpush](https://developers.cloudflare.com/workers/observability/logs/logpush/).
- **Sentry:** Developer $0, one user, 5,000 errors/month and email notifications; Team advertised $26/month when billed annually with default prepaid data. Dedicated grouped application failures, release tags and issue notifications; explicit capture is needed for handled 5xx and Cron outcomes. Medium implementation effort: optional configuration, Worker-compatible SDK, local mock transport and a strict outgoing allowlist. SDK defaults must not be trusted to exclude all sensitive data. Disable request context, breadcrumbs, tracing, replay and automatic log forwarding; omit arbitrary error messages and user-supplied values. No browser SDK is needed for the requested Worker scope, which avoids exposing visitor IPs directly to a tracker and keeps browser CSP unchanged. Source: [official pricing](https://sentry.io/pricing/), fetched successfully using curl after the web reader rejected its content type. SDK compatibility is still to be checked before installation; no package installed at this checkpoint.
- **UptimeRobot:** Free supports commercial/business use, 50 monitors, five-minute checks, and email alerts. Low effort: human creates unauthenticated monitors with no cookies, request bodies, query tokens or credentials. Catches endpoint timeout, DNS/TLS/network failures and HTTP failures, including an outage of the application's own platform; does not diagnose code or prove database/auth/provider functionality. Detection is bounded by check interval plus confirmation/delivery latency, not a guaranteed five-minute notification SLA. Sources: [free plan eligibility and limits](https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan), [monitoring and alerts](https://uptimerobot.com/).
- **Better Stack uptime:** advertised Free for personal projects, 10 monitors/heartbeats, three-minute checks, Slack/email alerts. Faster free polling, but eligibility for this SaaS must be confirmed rather than assumed. Advertised paid responder starts $34/month or $29/month with annual billing. Similar public-endpoint privacy and functional limits to UptimeRobot; no automatic access to application content is needed. Sources: [pricing and eligibility wording](https://betterstack.com/pricing), [check intervals](https://betterstack.com/docs/uptime/check-frequency/).

**Original recommendation (subsequently selected by the human):** Sentry Developer for sanitized server-side errors plus UptimeRobot Free for independent uptime/email alerts. This provides explicit application-error notifications and external failure detection without a paid plan or an ambiguous personal-project eligibility assumption. Use separate logical API/web identifiers, 100% eligible error sampling within the free quota, no performance/replay data, and bounded alert repetition. Quota exhaustion, email delays and provider failures remain possible; no unlimited delivery guarantee. Optional Cloudflare log persistence should be considered separately after its privacy implications are resolved.

**Human choice:** Sentry Developer + UptimeRobot Free, selected before SDK installation. Additional human requirements: server-only/no CSP changes, no PII, real trial/release tags, no expected 4xx, no DSN outside Workers Secrets, no database-backed uptime checks, bilingual privacy disclosure/draft notice and manual provider setup. No account, real secret, deployment or live monitor was created.

## Initial existing-code observations

- API `src/worker.ts` owns fetch and scheduled boundaries. Hono handles errors internally, so a Worker exception wrapper alone misses handled 5xx.
- `apps/api/src/middleware/http.ts` already logs safe method/status/duration/request identifiers. `BUILD_VERSION` exists in API env, but actual deployment version metadata is not bound.
- Web deploys generated `.open-next/worker.js`; monitoring must wrap the generated entry without editing generated source and preserve OpenNext context/exports.
- API `/health` is a no-write liveness endpoint; `/ready` checks PostgreSQL. No web health route was found during initial inspection. Root locale redirects must be followed to a successful localized page in an external monitor.

## Commands and actual results so far

- `git fetch origin && git switch main && git pull --ff-only origin main && git switch -c codex/owner-monitoring`: completed; branch is `codex/owner-monitoring`, base `97bfd30`.
- Read AGENTS and required continuity/architecture/style/deployment/operations documents and inspected Worker manifests, request/error boundaries and Next/OpenNext configuration. No secret files were opened.
- Official web research completed as linked above. `curl -fsSL https://sentry.io/pricing/ -o work/monitoring/sentry-pricing.txt`: exit 0; pricing/free-email/5k-error entries verified in the public HTML. Third-party pricing summaries were excluded as evidence.
- Baseline source copied from `git archive HEAD` to ignored `work/monitoring/baseline`, excluding `.env*` and `.dev.vars*`; dependencies installed physically inside that copy. No local credentials copied.
- Baseline `bun --no-env-file install --frozen-lockfile`: exit 0, `398 packages installed [366.00ms]`. Two earlier sandboxed attempts failed with `EROFS accessing temporary directory`; rerunning the same frozen install with approved filesystem/network access succeeded. No lockfile change.
- Baseline API: `bun --no-env-file x --no-install wrangler deploy --config apps/api/wrangler.toml --dry-run --outdir work/api-baseline`, under a cleared environment with PATH/HOME and Wrangler dotenv/logging/metrics disabled: exit 0, `Total Upload: 4658.78 KiB / gzip: 830.91 KiB`, `--dry-run: exiting now.`
- Baseline web: `bun --no-env-file run --cwd apps/web build:cloudflare`, under the same cleared environment with the two explicit public trial origins and runtime API_URL: exit 0, `OpenNext build complete.` Existing Node punycode deprecation warning observed.
- Baseline web dry run: `bun --no-env-file x --no-install wrangler deploy --config apps/web/wrangler.toml --dry-run --outdir work/web-baseline`: exit 0, `Total Upload: 6963.77 KiB / gzip: 1374.16 KiB`, `--dry-run: exiting now.`
- Baseline logs remain under ignored `work/monitoring/baseline/work/`. These measurements are against unchanged main source, not a completed monitoring implementation. No deployment occurred.

## Implemented design and affected files

- Exact `@sentry/cloudflare@11.8.0` for the API and `@sentry/nextjs@11.8.0` for web. Registry metadata (`bun info`) confirms stable/latest, Node22.12+ compatibility (local22.22.2), Wrangler4 and Next14/15/16. The package lookup initially used misplaced global flags and returned Property not found; repeating the documented `bun info` form in the secret-free copy returned the actual metadata. Frozen lockfile is updated; existing OpenNext and pg-cloudflare patches are preserved.
- Official [Sentry Next.js-on-Cloudflare guide](https://docs.sentry.io/platforms/javascript/guides/cloudflare/frameworks/nextjs/) documents the supported Worker wrapper since11.6.0 and Next server onRequestError. It was fetched directly after the web reader rejected its content type. Existing nodejs_compat and compatibility date2026-10-14 exceed the documented2025-08-16 minimum. This is an actual supported integration, not an attempt to force the Node SDK into Workers.
- `packages/monitoring/src/index.ts` holds shared collection/sampling and beforeSend policy. SDK11 replaced sendDefaultPii: the explicit false policy is applied using dataCollection.userInfo=false, with cookies/headers/bodies/query/source variables/database/AI/GraphQL/queue content also disabled. Traces sample0, all spans ignored, logs/metrics dropped, no replay/profiling/default integrations/client reports. Eligible errors sample1. beforeSend rebuilds a finite allowlist; no free error messages, request paths, credentials, cookies, arbitrary extras, email/IP or draft content leave. Static bundle basename/numeric line/column only survive for grouping.
- SDK initialization/capture is bypassed without a valid Sentry cloud secret AND actual CF_VERSION_METADATA UUID. Both Wrangler manifests add only version metadata; web points to the custom wrapper. Trial origin vars, Cron schedule, security policy, database transaction/ownership and published-only/no-store policies are retained. DSN values are absent from manifests/repository; all fixture DSNs/versions are explicitly synthetic.
- `apps/api/src/lib/monitoring.ts` and `apps/api/src/worker.ts` cover exceptions, returned5xx and Cron failures; scheduled tasks now also return the registered Promise so failures reach capture. Cron success/failure console events include environment and actual version when supplied; success is not sent to Sentry and a missing Cron trigger is not monitored.
- `apps/web/worker.ts`, `apps/web/monitoring.ts` and `apps/web/src/instrumentation.ts` use the supported server-only boundary and Next hook without generated-source edits or withSentryConfig. Returned5xx is captured only if this invocation did not already capture the failure. `packages/monitoring/src/head.ts` uses a public per-event CloudflareClient/createTransport in a separate isolation scope for HEAD/OPTIONS, which automatic SDK fetch wrapping intentionally skips. Its bounded transport runs through waitUntil without changing the application response. No vendor patch was added.
- `apps/web/src/app/health/route.ts` is provider-free/no-write liveness. Uptime monitors remain exactly GET API/health and prerendered web/en; no readiness/portfolio/database query. `legal-copy.ts` names Sentry/UptimeRobot in both translations while retaining the draft warning; E2E adds only exact proper-name exceptions and explicit disclosure/draft checks.
- `apps/api/tests/monitoring.test.ts`, both test-only Worker fixtures and `scripts/test-worker-monitoring.ts` prove outgoing privacy, optionality and runtime capture. No fault endpoint is mounted in either production app. The CI Workers job runs the actual built-web mode after OpenNext build. `docs/MONITORING.md` contains the exact owner setup/silencing/release checklist; continuity/source/dependency/deployment/operations documents are reconciled.

## Local runtime and browser proof

- Final focused harness: **28 Workers monitoring checks passed; all ingestion mocked; no external provider/database traffic.** Both wrappers captured deliberate unhandled exceptions,500/503, Cron failure or the actual Next hook.400/401/403/404/422/429 and successful requests produced no error event. HEAD/OPTIONS failures and no-secret runs are covered; ingestion503 does not rewrite the app response or retry.
- Whole outgoing envelopes are inspected for planted cookies, Authorization, request bodies, token query strings, emails, IPv4/IPv6 and private portfolio text. beforeSend unit checks also cover future SDK fields, getters/serializers, missing/forged identity, non-error telemetry and stack source/context removal.
- Actual generated OpenNext is loaded in local workerd with assets and every outbound fetch intercepted. With DSN absent and with a synthetic DSN: /health and /en return200 with **zero API calls**, /en/does-not-exist returns404 with no event, and a mock API503 causes the real published-render failure to return500 and emit exactly one scrubbed error when enabled. This is a local fault fixture, not a hosted portfolio/monitor probe. Next's expected PUBLIC_RELEASE_UNAVAILABLE console trace appears during that deliberate fault.
- Browser production-build journeys include both single-language privacy pages, both provider names, retained draft notice, Arabic RTL, normal bilingual auth/studio/publication and publication isolation. Final complete-run evidence is recorded below. Browser chunks were scanned for internal SDK/ingest/trace/replay markers: zero hits. CSP source is byte-identical to main.

## Development failures and corrections (not hidden as pre-existing)

- Initial privacy type checks caught SDK11 option/API changes; the implemented policy uses the actual dataCollection/outgoing hooks rather than ignored legacy flags. A typed-array transport body needed an owned ArrayBuffer for current DOM typings. All were corrected before final acceptance.
- Initial local fixtures used a nonexistent Miniflare waitForIdle method and invalid scheduled-event metadata. Fixtures now drain their own registered background Promises deterministically and supply real Cron shape. The built-assets harness needed run_worker_first plus has_user_worker; an initial assertion also assumed one page/API read, overlooking metadata rendering. These were test-harness defects; the correct invariant is zero API calls for liveness and at least one intercepted call for the deliberate rendering fault.
- The HEAD/OPTIONS regression exposed stale last-event identity suppressing a later web5xx after per-event capture. The final code isolates that client and compares event identity before/after each web invocation. The ingestion-outage regression now passes.
- One formatter gate failed on the newly added harness indentation and was fixed. No failing product gate was labelled pre-existing. An automatic-approval-service quota failure stopped one runtime command on2026-10-21; it was not a safety rejection and no bypass occurred. The human requested continuation on2026-10-22, and the same mocked verification subsequently passed.
- Sandbox process/network isolation could not see the host test PostgreSQL. A restart attempt reported its existing lock; a host status check proved the original owned instance was already accepting connections. No lock removal, reset, data loss or hosted database access occurred.

## Final quality gates and bundle measurements

All final commands below ran on the isolated, physically installed source copy under `work/monitoring/current`, without environment files. PATH/HOME were retained; explicit public API/web trial URLs, NEXT_TELEMETRY_DISABLED=1, Wrangler dotenv/metrics/log-file disabling and only loopback TEST_DATABASE_URL were supplied. Source/config parity:491 non-Markdown files, zero mismatches. All fifteen checks exit0.

```text
bun install --frozen-lockfile
  Checked 448 installs across 601 packages (no changes) [14.00ms]
bun audit
  No vulnerabilities found (checked 539 packages) [794.00ms]
bun run typecheck
  API tsc, Next typegen/tsc and E2E tsc: exit 0
bun run check
  Checked 419 files in 101ms. No fixes applied.
bun run test:web
  37 pass; 0 fail; 685 expect() calls
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55432/folio_test bun run test
  75 pass; 12 skip; 0 fail; 5264 expect() calls
  Native enforced MFA child: 11 pass; 0 fail; 308 expect() calls
bun run test:worker-storage
  8 Workers storage regressions passed; no provider/database requests.
bun run test:worker-mail
  15 Workers mail checks passed; all outbound traffic mocked, no real email/database/provider request.
bun run build
  Generating static pages: 50/50; exit 0
bun run --cwd apps/web build:cloudflare
  Generating static pages: 50/50; OpenNext build complete.; exit 0
bun x --no-install wrangler deploy --dry-run --config apps/api/wrangler.toml --outdir <absolute-project-work>/gates/api-bundle
  Total Upload: 5130.08 KiB / gzip: 938.15 KiB; --dry-run: exiting now.
bun x --no-install wrangler deploy --dry-run --config apps/web/wrangler.toml --outdir <absolute-project-work>/gates/web-bundle
  Total Upload: 9695.11 KiB / gzip: 1996.45 KiB; --dry-run: exiting now.
bun run test:worker-monitoring --web-built
  28 Workers monitoring checks passed; all ingestion mocked; no external provider/database traffic.
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55432/folio_test bun scripts/test-worker-database.ts
  7 Workers database checks passed; local folio_test only; 12 concurrent clients isolated; real idle termination retained.
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55432/folio_test bun run test:e2e
  43 passed (30.4s)
```

The absolute outdirs above are `work/monitoring/current/work/gates/api-bundle` and `web-bundle` under the independent checkout. Full command arrays, exit codes and timings are in ignored `work/monitoring/current/work/gates/results.json`; output per command is alongside it. The user-requested `(cd apps/api && bunx wrangler deploy --dry-run --outdir ../../work/api-dry-run)` has the same config/build target; the verified invocation uses explicit config and absolute output to avoid Wrangler's config-relative outdir ambiguity. Existing12 conditional integration skips are unchanged; native MFA's separate enforced child actually passes11 tests. No test was disabled, skipped or quarantined for this feature.

Measured before/after against the same base and explicit public URLs:
- API:4658.78 to5130.08 KiB raw (+471.30 KiB);830.91 to938.15 KiB gzip (+107.24 KiB).
- Web:6963.77 to9695.11 KiB raw (+2731.34 KiB);1374.16 to1996.45 KiB gzip (+622.29 KiB).
- Web raw9.47MiB is approximately14.8% of64MiB, with approximately54.53MiB headroom. Its gzip1.95MiB is also below the older3MiB OpenNext guide figure. No size stop threshold is approached. Source maps are not uploaded. Dry runs do not measure hosted CPU/startup or prove a real deployment.

Official limit verification: [current Workers limits](https://developers.cloudflare.com/workers/platform/limits/) on2026-10-21/22 states64MiB uncompressed for Free/Paid and no compressed limit. Its Worker-size section says Total Upload is the applicable metric and gzip is informational. The [OpenNext overview](https://opennext.js.org/cloudflare) still mentions the older3MiB compressed Free limit; the current primary Workers page takes precedence. We record both raw and gzip sizes, and the prepared web bundle is also below that older boundary. Use an80% headroom warning threshold and stop if approached; no current bundle approaches either threshold. Hosted startup time/CPU eligibility remains unverified by dry runs.

## Known limits / not verified

No real Sentry organization/project/region or privacy/alert setting, DSN provisioning, hosted ingestion, quota entitlement, alert delivery/email latency, UptimeRobot account/contact/monitor, hosted cookie/auth/provider flow, deployment or production release has been verified or changed. The human must choose the data region and privately verify their own notification address/settings. No real alert recipient is invented or committed. No database migration or resource provisioning is needed.

The free error allowance can be exhausted; there is no durable retry queue or ingestion-outage alert. New-issue notifications are not an email for every repeated event. Uptime is300-second polling plus provider confirmation/delivery latency, not a guaranteed minutes-level SLA. Approved uptime probes intentionally do not detect database/auth/mail/R2 failures. Missing Cron execution/heartbeat, performance/tracing, browser-only errors, source-map uploads, production startup/CPU, backup restoration and live mail/storage remain outside verified scope. Existing console diagnostics are not exported by this feature; Cloudflare persistence/invocation logging is not enabled here.


## Operational documentation acceptance — 2026-10-22

Implementation commit: `2f69306 feat(monitoring): capture private server errors`. Branch `codex/owner-monitoring`; [PR5](https://github.com/2ve2/FolioCraft/pull/5) is open and unmerged. The operational runbook, source/dependency maps, Cloudflare/operations links and final continuity record form a separate documentation step. No source/configuration changed after the implementation commit.

Repeated all15 commands above before the documentation commit: every exit code is0. Frozen install:448 installs/601 packages, no changes [15.00ms]; audit:no vulnerabilities/539 packages [690.00ms]; Biome419 files/98ms/no fixes; API75 pass/12 unchanged conditional skips/0 fail/5264 assertions plus enforced MFA11/0/308; web37/0/685; storage8/8; mail15/15; Next/OpenNext50/50; monitoring28/28; database7/7; Chromium43 passed (36.1s). Typechecks and both dry runs exit0. API5130.08 KiB/gzip938.15; web9695.11 KiB/gzip1996.48. The web gzip rerun varies by0.03 KiB; raw size and limit comparison are unchanged. First implementation logs were preserved under `work/monitoring/implementation-gates`; latest per-command logs/results remain under `work/monitoring/current/work/gates`.

Cleanup after acceptance: local loopback folio_test query reports0 remaining generated E2E accounts; stopped only the owned PostgreSQL instance with pg_ctl fast stop; host-namespace socket checks confirm4300/4400/55432 closed. The unrelated untracked docs/ADMIN_CONSOLE_TASK.md is excluded and preserved. Remote PR checks started but were not yet complete when this record was prepared; local acceptance is not a claim about remote CI.

The exact ordered human setup/release commands are in [MONITORING.md](../MONITORING.md). No actual DSN/email address, new resource, deployment, migration, hosted ingestion or notification delivery is part of this acceptance.
