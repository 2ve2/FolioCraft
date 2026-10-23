# Published portfolio cache: manual trial rollout

This is preparation for the friends-only trial, not a deployment record. No staging, provider creation, secret setup or Neon migration was performed by the agent. Source and local evidence are in [the dated report](evidence/2026-10-22-published-isr.md). The human explicitly approved preparing the private R2/SQLite DO resources and the pinned adapter correction, within the free allowance.

## Behavior and boundaries

The runtime switch defaults to `false`. Original dynamic `/p/[slug]` routes remain the disabled path, so switching off bypasses existing cached HTML immediately for requests reaching the disabled Worker version. Cloudflare configuration propagation time is external and unmeasured; no global zero-second control-plane guarantee is claimed.

When enabled and both resources are present, the Worker rewrites only portfolio documents to an internal ISR route tree. Published root/project/article responses share `packages/portfolio` with preview, use release locale/direction and existing metadata/security/robots behavior. Successful HTML is stored through the official OpenNext R2 adapter, with official SQLite sharded DO tags. No regional Cache API, KV, CDN HTML caching, zone-purge token, Cloudflare Queue or new Worker is used. Other routes/data/redirects/errors/cookie-setting responses are excluded from this cache. Missing/unavailable internal responses fall back to the original dynamic route, which alone reads visitor language. Public access to the internal route tree and revalidation route is rejected.

The official adapter is narrowly patched to propagate failed tag checks/exhausted writes and SQLite tag-read errors. A unique per-delivery receipt is expired after the site/slug tags; the binding entrypoint independently reads persisted tags before acknowledging success, because Next may swallow background revalidation errors. Receipts are technical tag rows, retained in the DO; no automatic receipt pruning is implemented. Render-start provenance prevents an old in-flight render uploaded later from looking newer than its invalidation. No fetch/data cache is persisted to R2. The custom adapter name also prevents OpenNext CLI from seeding unrelated prerendered platform/auth pages into this bucket.

PostgreSQL row-change triggers enqueue site/slug generations in the same mutation transaction, covering publication/unpublication/activation, slug old/new, moderation, owner bans, site/account cascades and asset removal. Acknowledged generations remain as small tombstones, preventing concurrent delivery/ABA races. There is no FK that can delete pending work with an account. Ordinary draft edits do not invalidate or publish content. Newest affected targets receive immediate delivery before the API mutation response. Retries do not poll PostgreSQL: a failed delivery writes a unique `pending` object (`ichnara-signals/cache-invalidation-pending`) to the same private bucket through the API's `PUBLIC_CACHE_SIGNAL` R2 binding. The minute Cron reads only that object; without it, no database connection is opened, so Neon can still scale to zero. With it, the Cron drains bounded batches and marks the signal `clear` only when nothing is pending and the object is unchanged since it was read (etag precondition; marks carry unique content because R2 etags hash content). Daily maintenance also drains the whole backlog as a backstop for work whose signal could not be written (for example a Worker stopped between commit and delivery). Without the R2 binding the minute Cron does nothing and only the daily backstop retries.

Healthy target: requests started after successful invalidation do not see old HTML. Retry frequency is **not** a one-minute staleness guarantee. If writes remain unavailable while tag reads still succeed, stale content can remain for the outage plus backlog/scheduling time, with **no finite maximum**. Failed tag reads bypass cached entries. Failures remain queued, log `cache_invalidation_failed` and report through Sentry when configured. If stale visibility is suspected, disable the runtime switch first. Signed asset URLs retain their documented expiry; downloaded copies cannot be recalled.

## Free allowance, not a spending cap

[Official R2 pricing](https://developers.cloudflare.com/r2/pricing/) includes Standard10 GB-month,1 million Class A/month and10 million Class B/month; excess is billable. [DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) supports SQLite on Workers Free, with100,000 requests/day,13,000 GB-s/day,5 million SQL row reads/day,100,000 row writes/day and5 GB SQL storage. Free DO excess operations fail.

No paid-only feature is required. These are shared account allowances, not verified account headroom or guaranteed future zero charges. Review existing account usage before provisioning and monitor it afterward. Receipts/outbox tombstones and R2 route keys grow with actual activity. The initial one-shard/no-replication configuration reduces DO fan-out. Keep R2 Standard and the bucket private; no `r2.dev`, public domain or CORS policy is needed for cached HTML. Do not enable a paid plan or accept paid usage as part of this runbook. If the account cannot stay within its allowance, leave the cache disabled.

## Ordered human commands and checks

Run only after reviewing/merging the PR. Run from the independent checkout. Commands below are **not executed by the agent**. Keep secrets out of arguments, files, logs and this document; `wrangler secret put` prompts privately. Use the same `PORTFOLIO_REVALIDATION_SECRET` value for the two existing Workers.

1. Fetch reviewed source and install. Record the currently deployed API/web version IDs privately for rollback; verify these are the existing trial targets.

```sh
cd ~/Desktop/blog-website/work/github-upload
git switch main
git pull --ff-only origin main
bun install --frozen-lockfile
```

2. Review the entire additive `0010_volatile_daimon_hellstrom.sql`, including triggers and preservation comments. Obtain a verified backup under the existing operations procedure. Supply the intended Neon `DATABASE_URL` privately in the human's migration environment, then apply the reviewed migration. Never substitute Neon into the test wrapper.

```sh
bun run db:migrate
```

Rollback: keep the additive table/triggers/data; deploy the prior application version if needed. No destructive down migration, reset or schema push. Old application code can coexist with the outbox. Confirm original published/draft behavior before proceeding.

3. Build/deploy code disabled, using the current public build origins. The normal manifests do not require the new resources. Existing Worker secrets are retained; do not rotate unrelated secrets.

```sh
NEXT_PUBLIC_API_URL=https://api.lord2ve.tech NEXT_PUBLIC_WEB_URL=https://lord2ve.tech bun run --cwd apps/web build:cloudflare
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bun --no-env-file x --no-install wrangler deploy --config apps/api/wrangler.toml
cd apps/web
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bun --no-env-file x --no-install opennextjs-cloudflare deploy --config wrangler.toml
cd ../..
```

Check public content, draft isolation, Arabic/English, sign-in, unavailable portfolios and `/health`. No cache HIT is expected yet. Rollback: use `wrangler rollback <RECORDED_VERSION_ID> --config <MATCHING_MANIFEST>` for each affected existing Worker, using the actual recorded ID; do not invent an ID. Keep the additive migration.

4. After reviewing free headroom, create exactly the private Standard bucket and configure the shared secret by name. The DO namespace is created by the reviewed SQLite class migration during the optional web deployment; there is no separate DO-create command.

```sh
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false bun --no-env-file x --no-install wrangler r2 bucket create ichnara-portfolio-cache
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false bun --no-env-file x --no-install wrangler secret put PORTFOLIO_REVALIDATION_SECRET --config apps/api/wrangler.toml
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false bun --no-env-file x --no-install wrangler secret put PORTFOLIO_REVALIDATION_SECRET --config apps/web/wrangler.toml
```

Rollback: leave unused resources private; stop here with the switch off. No bucket/namespace deletion is required or advised. A shared-secret mismatch must leave intents pending and emit failure signals; never bypass the secret check.

5. Deploy the optional resource manifests while still disabled. The prepared web manifest binds R2 and declares `DOShardedTagCache` with `new_sqlite_classes`; the API manifest adds the named Service Binding and the `PUBLIC_CACHE_SIGNAL` binding to the same bucket (no new resource). Check worker names before each command.

```sh
cd apps/web
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bun --no-env-file x --no-install opennextjs-cloudflare deploy --config wrangler.cache.toml
cd ../..
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bun --no-env-file x --no-install wrangler deploy --config apps/api/wrangler.cache.toml
```

Confirm the minute trigger runs without database connections while nothing failed (Neon should still scale to zero in its dashboard), no `cache_invalidation_failed` recurs, and pending generations drain. Public POST to `/api/internal/revalidate-portfolio` must return404 even with a correct credential; do not put that credential in a curl command. Rollback: deploy the normal manifests, leaving resources/data intact and cache disabled.

6. Enable only as a separate step. Run a disposable trial publication journey immediately afterward: A -> view twice -> draft B -> public still A -> publish B -> public B -> unpublish -> next GET404. Also verify moderation, old/new slug, account removal, article/project URLs, locale/direction, security headers/noindex, missing-then-created and absent-secret rejection through the private binding. Hosted acceptance is not inferred from local tests.

```sh
cd apps/web
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bun --no-env-file x --no-install opennextjs-cloudflare deploy --config wrangler.cache.toml --var PORTFOLIO_CACHE_ENABLED:true
```

After the checks pass, release with `bun run deploy:trial --cache` from then on: it remembers the cache mode and always deploys both cache manifests with the cache enabled, so a later release cannot deploy the API without its invalidation bindings while the web keeps serving cached pages. `bun run deploy:trial --normal` returns to the normal manifests (cache off).

Immediate operational rollback command (same built source/resources, bypass cached pages):

```sh
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bun --no-env-file x --no-install opennextjs-cloudflare deploy --config wrangler.cache.toml --var PORTFOLIO_CACHE_ENABLED:false
```

Check an already-warmed portfolio, edit/publish/unpublish again, confirm fresh dynamic behavior and404, and inspect failure signals/pending generations. Keep the binding active until pending deliveries recover; do not delete storage to mask a delivery failure. Control-plane rollout duration remains unmeasured.

## Trial TTFB measurement

Choose an already-published, non-sensitive disposable portfolio and replace only the public slug. Run before activation and again afterward. The first request measures a cold path only if that Worker/route was actually cold; repeat requests measure warm behavior. Save numbers/statuses/headers, never cookies or page bodies.

```sh
for run in $(seq 1 20); do
  curl --silent --show-error --output /dev/null --write-out "$run status=%{http_code} ttfb=%{time_starttransfer} total=%{time_total}\n" 'https://lord2ve.tech/p/REPLACE_PUBLIC_SLUG'
done
curl --silent --show-error --head 'https://lord2ve.tech/p/REPLACE_PUBLIC_SLUG'
```

Expect successful warm ISR responses to report `x-nextjs-cache: HIT` while browser/CDN `Cache-Control` remains private/no-store. Compare medians, cold starts and actual API request volume. Do not retain activation solely on local results if the trial regresses. These commands send no authentication credential.
