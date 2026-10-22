# Published portfolio ISR: design and verification

Date: 2026-10-22, Asia/Riyadh. Branch: `codex/published-isr`, from freshly fetched/fast-forwarded main `afac7a3`. Work is exclusively in the independent GitHub checkout. Unrelated untracked `docs/ADMIN_CONSOLE_TASK.md` is excluded. No deployment, hosted migration/test, resource creation, provider-account access or secret inspection occurred.

## Problem, design before implementation and approvals

Every public portfolio view previously fetched the independent API with no-store. Draft isolation and immediate publication withdrawal must survive caching. Before application changes, the scope/design, mutation inventory and official verification were recorded here and in CHANGELOG. The initial installed-adapter diagnostic produced six passing assertions proving unsafe upstream behavior: four failed writes still resolved, while three failed reads returned false/0/false. This was a diagnostic failure finding, not successful invalidation.

The human prescribed OpenNext's official R2 incremental cache plus sharded SQLite Durable Object tags; no KV, regional Cache API, CDN HTML caching, purge token, Cloudflare Queue or staging. Backend revalidation uses a private Service Binding and constant-time checked shared Worker secret, with loopback URL fallback only for local Bun. The human subsequently explicitly approved the narrow reliability patch and preparing a private Standard bucket `ichnara-portfolio-cache` plus `DOShardedTagCache`, within free allowances. Provisioning/deployment remain human-only.

Alternatives were evaluated before the architecture override: eventual KV consistency, per-colo Cache API and CDN purge cannot satisfy the prescribed coordination/reliability boundaries. The implemented choice uses the required official adapters with no time-based regeneration queue. Engineering details below are not separately human-confirmed product decisions.

## Official verification

- [OpenNext caching](https://opennext.js.org/cloudflare/caching): R2 and sharded DO tags, optional regional caches, on-demand revalidation; no time-based regeneration queue needed here.
- [OpenNext custom Worker](https://opennext.js.org/cloudflare/howtos/custom-worker) and [Service Binding entrypoints](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/rpc/): wrapper plus named binding-only entrypoint. A publicly reachable secret-protected route alone is insufficient.
- [Official tag adapter](https://github.com/opennextjs/opennextjs-cloudflare/blob/main/packages/cloudflare/src/api/overrides/tag-cache/do-sharded-tag-cache.ts) and installed1.20.11: exhausted writes/read errors are swallowed. Human-approved Bun patch propagates these failures and underlying SQLite read failures. Inclusive timestamp comparison handles equal milliseconds; monotonic expiration prevents an older delivery overwriting a newer expiration.
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/): Standard includes10GB-month,1M Class A/month and10M Class B/month; excess is billable. [DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/): Free supports SQLite;100k requests/day,13kGB-s/day,5M row reads/day,100k row writes/day and5GB storage. Free excess operations fail. No paid-only feature is required. Account headroom and future usage are not verified; these are not a spending cap or a guarantee of zero charges.

## Implemented cache and security boundary

Original `/p/[slug]` dynamic routes remain unchanged. The default-off Worker passes them to the original handler. Only when explicitly enabled with both bindings does it rewrite root/project/article document GET/HEAD into the hidden ISR tree. Published layouts read only release language; cookie/header-dependent missing/unavailable output falls back to the original dynamic route. Both paths use the existing shared portfolio renderer and metadata/security policy.

A wrapper around the official R2 adapter persists only status200 app entries in that internal route tree with render-start provenance. Data/fetch entries, unrelated platform/auth/admin/studio routes, errors, redirects, negative entries and cookie-setting responses are rejected. A custom adapter name prevents OpenNext CLI from broadly seeding unrelated prerendered pages. No isolate memory cache or browser/CDN HTML caching can bypass tag validation. Successful public HTML has private/no-store browser cache control. ISR HITs avoid API/database reads.

Each full-route entry collects site and slug tags. Render-start time replaces upload time for invalidation comparisons, so an older render uploaded after invalidation cannot look newly valid. Monotonic tag expiration resists reordered invalidations. Public requests to reserved ISR/revalidation paths are rejected, even with the correct secret. Only `PortfolioRevalidation` on the existing web Worker reaches the internal Next route, which additionally validates a bounded strict message and compares fixed-size credential digests using `timingSafeEqual`.

Built-runtime fault injection showed Next can swallow background revalidation errors even after the adapter rejects. The binding entrypoint therefore awaits completion tasks and independently reads persisted site/slug tags plus a unique per-attempt final receipt through the official DO grouping. Missing receipt/read failure returns503. Receipts are retained tag rows; no automatic pruning is implemented.

## Durable mutation inventory and proof

Explicit migration `0010_volatile_daimon_hellstrom.sql` adds only the generation outbox/index/functions/triggers; existing content/auth rows are not rewritten or removed. No cascading FK can erase pending work. Acknowledged generation tombstones prevent ABA during concurrent delivery. Transaction rollback rolls back intent. No destructive migration/reset/schema push was used.

Actual guarded integration tests exercise these paths and inspect persisted generations plus immediate delivery:

- `releaseService.publish`: first/new publication; ordinary draft edits produce no invalidation. `unpublish` and `activate`: pointer changes enqueue in the same transaction.
- `siteDraftService.update`: slug mutation queues both old and new slug. Site tags cover all detail URLs.
- `adminSiteService.moderate`: suspend/resume enqueue and immediately deliver after the authorized mutation.
- `adminUserService.mutate`: native ban/unban update owner visibility; native removal cascades sites. Both bans and account removal persist intent; removal retains IDs/slugs after cascades.
- Site deletion: no separate product deletion endpoint exists. Actual site-row deletion and account cascade are tested at the persistence boundary.
- `assetService.delete`: an allowed unreferenced asset enters deleting/deleted, enqueuing intent; provider deletion is mocked only in this integration test. Existing referenced-asset rejection remains intact.
- Rejected publication and explicit transaction rollback create no intent. A failed send increments attempts and remains pending. Successful retry acknowledges its generation. An older concurrent delivery cannot acknowledge a newer generation.

Authorized services register affected sites. Request middleware awaits delivery after mutation; each affected site gets priority independently of unrelated backlog. The API Worker supplies request-local binding delivery; local Bun permits only validated loopback fallback. Minute Cron retries oldest bounded batches; daily housekeeping remains separate. Failure logs `cache_invalidation_failed` and invokes configured Sentry capture without secrets/content. Missing binding leaves work durable while caching is disabled.

Healthy target: the next request started after successful invalidation sees the current state. Requests already rendering may complete their earlier snapshot; their late cache entry cannot survive expiration. During a sustained write-only outage with successful tag reads, stale visibility has **no finite maximum**: outage plus backlog/scheduling time. A one-minute retry frequency is not a one-minute staleness bound. Read failures bypass cached HTML. Disable the switch if stale visibility is suspected. No global clock/control-plane propagation guarantee is claimed. Existing signed asset URLs/downloaded bytes retain their prior limitations.

## Actual runtime and browser evidence

`TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55436/folio_test bun run test:e2e` passed **44/44**, zero retries, with cache routing enabled. Real local Chromium, production Next and the real API cover both languages: publish A -> view -> save draft B -> still A -> publish B -> B -> unpublish -> next GET404. The new test requests missing portfolios repeatedly, compares their language-bearing output directly with the unchanged dynamic server, then publishes that same slug and observes a HIT. Existing locale/RTL/auth/ownership/language tests also pass.

The browser runner uses a local proxy with the production rewrite/fallback policy and Next's filesystem cache. This approximation does not establish Cloudflare storage behavior. Separately, `TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55436/folio_test bun run test --public-cache-runtime` passed **15 built-Worker checks** using actual local OpenNext/workerd, R2, SQLite DO and a named Service Binding. It proves:

- root/project/article HITs; warm root has zero additional API reads; Arabic release lang/dir and CSP survive an English visitor;
- cached entries are only200 published app pages and include both site/slug tags; draft B is absent from HTML and all R2 entries;
- missing responses produce no R2 entry, public internal access is404 even with a valid secret, private absent-secret access is401, switch-off uses fresh API;
- real publication/unpublication affects the next HTTP request and all detail routes;
- an older tag write cannot reduce a newer expiration; a held old API read completes its cache write after republishing, yet the next same-detail request displays the newer release;
- renaming only the local test DO table forces real write/read failures: intent remains pending, no false204 acknowledgement, unchecked cache is bypassed; restoring the table allows successful retry and acknowledgement.

The actual expected fault logs are local diagnostics, not provider errors. No remote ingestion was tested. Temporary faults preserve/restore test data. Fixture accounts and their outbox rows are removed on completion.

Local HTTP TTFB from the successful15-check run, ten warm requests per mode:

```json
{"coldUncachedTtfbMs":277.42,"coldCachedTtfbMs":321.97,"uncached":{"count":10,"medianMs":26.09,"minMs":23.93,"maxMs":28.5},"cached":{"count":10,"medianMs":6.61,"minMs":4.93,"maxMs":8.73}}
```

Warm median improved about3.95x in this local run. The first cached route request was slower; this is not proof of cold-start improvement or distributed/trial performance. The uncached cold sample is its actual first route request, without prewarming. An earlier13-check measurement incorrectly labeled a prewarmed uncached request cold and is superseded. The runbook supplies a simple20-request curl loop for the human's before/after trial measurement.

## Quality gates and observed failures

All commands run from the independent checkout; `TMPDIR` points inside ignored `work/published-isr/tmp`. Integration uses only disposable local `folio_test` on127.0.0.1:55436. Raw logs are ignored under `work/published-isr/gates/`. Both completed gate sets are recorded below.

Intermediate failures were repaired and rerun: config bundler could not import `node:async_hooks` (runtime scope moved into Worker); clean build exposed a generated-import declaration issue (explicit ambient declaration); E2E proxy decompressed gzip while retaining headers (request identity encoding); the new missing-page test over-assumed Arabic root language (now compares unchanged dynamic output); actual fault injection exposed swallowed Next errors (persisted receipt); test-only RPC caller needed a current compatibility date. One API run received429 in native recovery after browser activity; the complete suite was rerun after normal rate-budget expiry, without clearing/disabling limits. None is dismissed as pre-existing.

Sandbox commands also failed before execution because synthetic bubblewrap mount registration hit quota. Reviewed unsandboxed local commands were used. Automatic review rejected one broad patch-cleanup command; it did not execute. An exact three-line removal preserved all substantive patch hunks instead. No unresolved permission request remains.

## Files and manual operations

Backend: schema/migration/meta, DB export, config/app/server/Worker, existing publication/draft/admin/assets services, public DTO route/service, cache invalidation service, integration/runtime tests and optional API manifest. Shared protocol is `packages/contracts/src/public-cache.ts`. Frontend: runtime/cache wrappers/configs/declarations, hidden ISR tree/private route/helpers/tests and optional web manifest; original dynamic portfolio source is unchanged. Harness/CI: guarded test runner, cache proxy, browser suite and workflow. Documentation: CHANGELOG, DECISIONS, STATUS, SOURCE_STRUCTURE, E2E, this evidence and PUBLIC_CACHE.

[PUBLIC_CACHE.md](../PUBLIC_CACHE.md) gives exact ordered human commands: reviewed backup/additive migration; disabled API/web deploy; private Standard bucket; shared secret by name only; optional SQLite/binding manifests while disabled; separate enable; trial acceptance/TTFB; exact disable/rollback checks. No commands there were executed against providers. Keep additive schema/resources on rollback; do not delete data to hide invalidation failures.

## Not verified and limits

No trial deployment, distributed/multiple-colo behavior, real account free headroom/billing, provider Cron execution, real Sentry ingestion, external mail/storage, Neon migration or trial TTFB was verified. CI execution will be observable only after pushing. Receipts/outbox tombstones and cached route keys grow; there is no pruning/billing hard cap. Failure staleness and configuration propagation have no finite guarantee. Future adapter/Next upgrades require the committed fault/race tests and patch review. Missing-language output is preserved, not redesigned. No screenshot matrix or visual redesign is claimed.

## Gate set A before the backend commit

All eleven commands exited0. Raw output (not fabricated summaries):

- `bun install --frozen-lockfile`: `1 package installed [50.00ms]` (existing pinned patched package; no version/lockfile change).
- `bun audit`: `No vulnerabilities found (checked 539 packages)`.
- `bun run typecheck`: API `tsc --noEmit`, web `next typegen && tsc --noEmit`, E2E `tsc --noEmit -p e2e/tsconfig.json`, exit0.
- `bun run check`: `Checked 450 files in 128ms. No fixes applied.`
- `bun run test:web`: `42 pass`, `0 fail`, `710 expect() calls`.
- `TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55436/folio_test bun run test`: `85 pass`, `12 skip`, `0 fail`, `5388 expect() calls`; `7 Workers database checks passed (unbound)` and `7 Workers database checks passed (local optional binding)`. The enforced-MFA child separately passed11/11 with308 assertions. Twelve parent conditional checks are not newly disabled/quarantined; no skip was added for this task.
- `bun run test:worker-storage`: `8 Workers storage regressions passed; no provider/database requests.`
- `bun run test:worker-mail`: `15 Workers mail checks passed; all outbound traffic mocked, no real email/database/provider request.`
- `bun run build`: `✓ Compiled successfully`; optimized Next build exited0.
- `bun run --cwd apps/web build:cloudflare`: `OpenNext build complete.`
- `(cd apps/api && bunx wrangler deploy --dry-run --outdir ../../work/api-dry-run)`: `--dry-run: exiting now.` No deployment.

The complete feature tree was present during these checks. The backend commit intentionally contains only its completed independently usable step; the already-verified web/runtime/browser step follows as a separate commit after another complete gate set.


## Gate set B, final build repeat and delivery

Before the separate web/cache/runtime commit, all eleven commands above ran again and exited0; raw logs are in `work/published-isr/gates-step2/`:

- Frozen install: `Checked 448 installs across 601 packages (no changes) [35.00ms]`.
- Audit: `No vulnerabilities found (checked 539 packages) [684.00ms]`.
- Typecheck: all three TypeScript commands exited0.
- Biome: `Checked 450 files in 144ms. No fixes applied.`
- Web: `42 pass`, `0 fail`, `710 expect() calls`.
- Guarded API: `85 pass`, `12 skip`, `0 fail`, `5388 expect() calls`; enforced-MFA child `11 pass; 0 fail; 308 expect() calls`; database Workers7 unbound +7 optional-bound checks passed.
- Worker storage: `8 Workers storage regressions passed; no provider/database requests.`
- Worker mail: `15 Workers mail checks passed; all outbound traffic mocked, no real email/database/provider request.`
- Next: optimized production build exited0, `✓ Compiled successfully`.
- OpenNext: `OpenNext build complete.`
- API: `--dry-run: exiting now.`

The cache runtime fixture was repeated against that final generated Worker and again passed15 checks. Actual final-run TTFB: first uncached223.92ms, first cached294.83ms; ten-request uncached median27.84ms (25.22–29.84), cached median5.01ms (4.57–7.50). Warm improvement is about5.56x in this repeat; cold remains slower. The earlier15-check values above are retained transparently, not replaced with a fabricated representative number. Raw final output is `work/published-isr/runtime-last-build.log`.

Branch was pushed and [PR#9](https://github.com/2ve2/FolioCraft/pull/9) opened against main. Backend step: `5c8a9bb feat(api): persist public cache invalidations`. The following web/cache commit completes the prepared feature and documentation; it is not merged. No deployment/provisioning occurred. Hosted CI is pending/not verified at handoff. Original dynamic portfolio sources and shared renderer have no source diff. The unrelated administrative-task Markdown remains untracked and untouched.

## Review fix: retry signal instead of minute polling (2026-10-22)

With the revalidation binding configured, the original minute Cron queried `cache_invalidations` every minute regardless of pending work, which keeps Neon compute awake. Retries are now gated on an R2 signal object (see PUBLIC_CACHE.md). Results: guarded API 88 pass / 12 skip / 0 fail, including "minute retry reads only the R2 signal and opens no database scope while nothing failed", "a failed delivery leaves a pending signal that the minute retry drains and clears" and "a failure recorded while the retry runs keeps the signal pending". The real workerd runtime harness (R2 + SQLite DO) passed 16 checks, including a new real-R2 check: no database scope without a signal, an older etag cannot clear a re-marked signal, and the signal reads `clear` after draining. That real check exposed that R2 etags hash content (identical empty marks collided); marks now carry unique content. Mutations of each new behaviour fail their test.

