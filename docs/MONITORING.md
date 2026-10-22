# Owner monitoring

Prepared 2026-10-21; updated 2026-10-22 for the friends-only trial. The human selected Sentry Developer and UptimeRobot Free. This runbook does not authorize a deployment or establish that any hosted alert has been delivered. [Actual local evidence](evidence/2026-10-21-owner-monitoring.md).

## What is monitored

- API: optional `@sentry/cloudflare` boundary for unhandled exceptions, handled HTTP 5xx and scheduled-maintenance failures. Maintenance success/failure still produces structured console outcomes with the actual Workers version when available. Successful Cron runs do not consume Sentry error events; this does not detect a Cron trigger that never fires.
- Web: official `@sentry/nextjs/cloudflare` boundary around the generated OpenNext handler and the Next server `onRequestError` hook. Exceptions and handled HTTP 5xx are captured; Next-captured failures are not repeated as generic 5xx events. Generated Durable Object exports remain available.
- HEAD/OPTIONS use an isolated SDK client with the same beforeSend policy, a bounded transport and no request instrumentation, because the SDK automatic wrapper skips those methods.
- Expected HTTP 4xx and successful requests are excluded. SDK spans, logs, metrics, profiling and replay are not sent. There is no browser SDK, browser DSN, tunnel, browser request or CSP change.
- Every outgoing error has `environment=trial`, `worker=api|web` and `release=<CF_VERSION_METADATA.id>`. The release is the actual deployed Worker version UUID. Absent/invalid Sentry cloud secret or absent/invalid version means no monitoring client/ingestion; no invented build identifier is substituted. Local tests use synthetic version metadata and mocked ingestion only.
- External uptime: exactly API `/health` and prerendered web `/en`, both read-only. The new web `/health` route is available for manual liveness diagnostics; it is not an additional external monitor. No readiness, account, portfolio, upload or mail probe is part of uptime monitoring.

## Privacy and sampling

Sentry 11.8.0 replaced the older `sendDefaultPii` SDK option with `dataCollection`. The shared explicit `sendDefaultPii=false` policy is applied as `dataCollection.userInfo=false`; cookies, headers, HTTP bodies, query parameters, database query data, stack variables, source context, queue payloads, AI and GraphQL content are also disabled. Do not add an ignored legacy SDK option and mistake it for an active control.

`beforeSend` reconstructs each event from a finite allowlist. It removes request URLs and paths (including reset/verification tokens in paths or queries), cookies, Authorization, request/response bodies, user/email/IP fields, breadcrumbs, arbitrary tags/contexts/extras, free error messages, draft content, source snippets and arbitrary stack data. Only fixed messages, finite error classifications, HTTP 5xx status, actual Worker version and generated event identity survive. Stack locations retain only recognized bundle basenames and bounded integer line/column coordinates; function names and directories never leave the Worker. These coordinates help separate failures without exposing content; source-map upload is not configured.

Error `sampleRate=1`: retain all eligible errors while quota permits. `tracesSampleRate=0` and all spans ignored: errors are the useful signal for this small trial; performance telemetry adds volume and request context without satisfying the immediate alerting need. Default integrations are disabled; logs/metrics are dropped by their outgoing hooks, no profiling/replay integration is installed, and client reports are disabled. Clients are per invocation (`cacheClient=false`) to avoid cross-request state retention. Sentry 5,000-error monthly quota is shared across this owner's organization/projects; a storm can exhaust it. Do not enable paid overage or a paid trial without separate approval.

Sentry sees the Worker transport connection, not a visitor's direct connection. Project-side IP prevention and scrubbing below add independent protection. UptimeRobot receives the two public URLs and their public responses, not user sessions or a monitoring API token. The owner supplies their notification address directly to the monitoring services; it is never committed here. Existing Cloudflare/provider processing and existing application security records are separate from these outgoing Sentry events. This change does not export console logs or enable new Cloudflare log persistence/invocation logging.

## Human setup checklist — no action performed by the agent

1. **Sentry Free organization/project.** Choose the organization's data region (US or EU) deliberately before creation; confirm it fits your obligations. Do not assume a selected region can be changed afterward. Use an existing approved organization if appropriate. Create one JavaScript project, `ichnara-trial`, for both Workers, separated by `worker` tags. Stay on Developer Free; do not activate paid extras.
2. **Project privacy settings.** Under Security & Privacy, enable **Prevent storing of IP addresses**, server-side **Data Scrubber**, and default sensitive-field scrubbing. Add sensitive-field rules for cookies, authorization, token, password, email, IP, request data, draft and content. These are defense in depth, not substitutes for tested outgoing filtering. Keep replays/profiles/performance collection off.
3. **Owner alert.** Verify the owner's email inside Sentry and enable personal issue email notifications. Create an Error/new-issue alert for `environment=trial`, severity error or higher: when a new issue is first seen, email the owner immediately, with the minimum supported action delay. Include regression notification if available. Set a five-minute per-issue repeat suppression if the UI offers it. Test the notification using the provider's own test-notification control and check spam. New-issue alerting is not an email for every repeated event; optionally configure a repeated-error detector within Free capabilities. No delivery or minutes-level SLA has been verified here.
4. **UptimeRobot Free account.** Add and verify the owner's alert email (the same owner mailbox used above, chosen privately). Select that email contact explicitly for BOTH monitors, for DOWN and UP/recovery alerts; do not leave contacts unassigned. No extra responder, SMS, voice or paid integration is required.
5. **Create `Ichnara API liveness`.** HTTP(S), GET `https://api.lord2ve.tech/health`, expected final status **200**, interval **300 seconds**, timeout **30 seconds**, TLS verification on, no authentication/custom cookies/Authorization/query/body, owner verified email selected. Response should contain `"status":true`; use that keyword check if supported by the chosen Free UI.
6. **Create `Ichnara web English landing`.** HTTP(S), GET `https://lord2ve.tech/en`, expected final status **200**, interval **300 seconds**, timeout **30 seconds**, TLS verification on, no authentication/custom cookies/Authorization/query/body, the same owner verified email selected. Monitor the prerendered English landing page, not `/`, `/ready` or `/p/...`. Follow only normal canonical HTTPS redirects if the provider requires a redirect setting; an unexpected redirect should be reviewed. Keep custom UP codes restricted to 200 wherever supported by the Free dashboard; do not buy an upgrade to obtain an optional control without approval.
7. **Verify the actual free UI.** Confirm both saved URLs, 300-second interval, expected status, TLS and selected email contact. Use provider test notifications; record actual delivery privately. Detection takes up to the polling interval plus confirmation and email-delivery time. These probes intentionally do not verify PostgreSQL, authentication, publication, storage or mail: they must not keep Neon compute awake. Do not add database-backed probes later without reviewing that cost.

## Human release commands (ordered, not executed here)

After reviewing and merging the PR, in the independent checkout:

```sh
cd ~/Desktop/blog-website/work/github-upload
git switch main
git pull --ff-only origin main
bun install --frozen-lockfile
NEXT_PUBLIC_API_URL=https://api.lord2ve.tech NEXT_PUBLIC_WEB_URL=https://lord2ve.tech API_URL=https://api.lord2ve.tech NEXT_TELEMETRY_DISABLED=1 CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bun --no-env-file run --cwd apps/web build:cloudflare
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bun --no-env-file x --no-install wrangler deploy --config apps/api/wrangler.toml --name foliocraft-api-trial --dry-run
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bun --no-env-file x --no-install wrangler deploy --config apps/web/wrangler.toml --name foliocraft-trial --dry-run
```

Review the target names and version-metadata binding. Supply the project DSN at each **interactive** secret prompt. Never paste it into source, a public variable, a visible command argument or a ticket. Secret commands can create a new active Worker version; perform these only during the approved rollout:

```sh
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bun --no-env-file x --no-install wrangler secret put SENTRY_DSN --config apps/api/wrangler.toml --name foliocraft-api-trial
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bun --no-env-file x --no-install wrangler secret put SENTRY_DSN --config apps/web/wrangler.toml --name foliocraft-trial
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bun --no-env-file x --no-install wrangler deploy --config apps/api/wrangler.toml --name foliocraft-api-trial
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bun --no-env-file x --no-install wrangler deploy --config apps/web/wrangler.toml --name foliocraft-trial
```

No migration, database change, R2/Resend change, new Cloudflare resource or source-map upload token is required. The existing trial domain vars, Cron schedule, CORS, session/ownership protections and publication/cache policy are retained. Enable the two external monitors after the approved release. Do not add a live fault route or deliberately break the trial to test alerts; use the local proof and provider test notification controls.

## Reading and silencing alerts

In Sentry filter by environment `trial`, then tag `worker:api` or `worker:web` and `release`. `kind:unhandled` means a server exception; `kind:http_5xx` includes the actual HTTP failure status; `kind:cron_failed` means scheduled maintenance rejected. Missing sensitive context is intentional. Use the actual version to locate the matching deployment/source, then correlate with sanitized application diagnostics. Successful Cron outcomes remain in the runtime's structured console stream; this scope adds no missing-heartbeat monitor.

For a false-positive issue, snooze/mute that issue or its alert for a bounded maintenance window and record when to unmute. Leave capture active while investigating. Pause BOTH UptimeRobot monitors during an approved maintenance window, then resume them and confirm healthy checks and owner contacts.

To stop Sentry capture entirely, the human can remove the `SENTRY_DSN` secret from the exact trial Worker in its dashboard (this may create a new version). Removing one Worker's secret affects that Worker only. Restore it interactively through the commands above when approved. Do not disable authentication/CSP or widen origins to troubleshoot monitoring. If ingestion is unavailable or quota is exhausted, keep application responses truthful and use the independent uptime channel; there is no durable telemetry retry queue.

## Local verification

```sh
bun test apps/api/tests/monitoring.test.ts
bun run test:worker-monitoring
bun run --cwd apps/web build:cloudflare
bun run test:worker-monitoring --web-built
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55432/folio_test bun run test
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55432/folio_test bun run test:e2e
```

The Worker harness intercepts all outbound HTTP and uses synthetic credentials/version identities only. It proves deliberate faults and disabled capture without contacting Sentry/Neon. The built-web mode additionally exercises actual generated OpenNext output. Browser tests keep both privacy translations and their existing draft notice, with exact provider names as proper-name exceptions. Full gate results and bundle measurements are in the dated evidence; local mock acceptance does not establish hosted notification delivery or provider entitlement.

## Official references

- [Sentry Next.js on Cloudflare](https://docs.sentry.io/platforms/javascript/guides/cloudflare/frameworks/nextjs/) documents the supported `@sentry/nextjs/cloudflare` Worker boundary since 11.6.0 and the Next server error hook. Installed SDK 11.8.0 and the existing node compatibility/date satisfy that documented path.
- [OpenNext custom Worker](https://opennext.js.org/cloudflare/howtos/custom-worker), [Cloudflare current size limits](https://developers.cloudflare.com/workers/platform/limits/), [Sentry pricing](https://sentry.io/pricing/), [Sentry SDK 11 migration](https://docs.sentry.io/platforms/javascript/migration/v10-to-v11/).
- [UptimeRobot Free eligibility](https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan), [monitor setup](https://help.uptimerobot.com/en/articles/11358364-how-to-create-your-first-monitor-on-uptimerobot-quick-setup-guide).
