# Cloudflare-only trial deployment

> **Testing only:** The Cloudflare-hosted instance is a trial for friends to test and report issues. It is not a final launch or an accepted production release. Deployment to Cloudflare makes the test instance reachable; it does not establish production readiness.

Last reconciled: 2026-10-15, Asia/Riyadh. Deployment and browser initial evidence below was collected on 2026-10-14. The JSON restore frontend update and its HTTP checks were completed on 2026-10-15 as noted below.

## Deployed trial

- Historical trial Worker names are foliocraft-api-trial and foliocraft-trial. Their recorded origins were https://foliocraft-api-trial.bdalrhmnmtwq53.workers.dev and https://foliocraft-trial.bdalrhmnmtwq53.workers.dev. They were not renamed or redeployed by the2026-10-18 cleanup. The2026-10-20 local preparation changes only future origin vars in the manifests; it does not establish live domain configuration.
- Any trial-api.example.com/trial-web.example.com URLs in documentation are reserved illustrative placeholders; replace them with the existing reviewed origins before an authorized build.
- Last verified web version: `fee5d122-d173-4dc9-8ea1-f4538807e8c8`.
- Last verified API version: `970d67cc-4caa-4ab8-aac7-b73c034989a2`.

The human authorized a free Cloudflare-only friends-testing deployment that runs with their computer off. No paid Containers, plan upgrade, tunnel or external backend host was used. PostgreSQL remains the existing Neon database and files remain in private R2. No deployment migration or reset was performed. A reachable trial is not comprehensive production acceptance.

## Runtime targets and source

- API `apps/api/wrangler.toml` deploys `src/worker.ts`, which calls the same Hono application as Bun `src/server.ts`. Node compatibility and process-environment population are enabled.
- Workers requests use an AsyncLocalStorage-scoped PostgreSQL/Drizzle pool with max1 and close it in finally. Bun execution retains its application pool. PostgreSQL transactions and owned draft/release contracts are retained.
- Request hashing uses Node SHA256. The Worker entry replaces the application client-address header using the Cloudflare edge address; Bun retains socket/exact-proxy handling.
- The `#image-validation` import maps to Sharp for Bun and the Cloudflare Images adapter for Workers. Workers validate size/MIME/dimensions and supported animation limits, then consume a transformed PNG to force decoding before the unchanged exact-byte conditional R2 copy. `IMAGES` is bound in API Wrangler configuration. Local adapter proof does not certify every corrupt-image variant or live provider upload.
- Web `apps/web/wrangler.toml` deploys generated OpenNext output with `ASSETS`; this is the full Next.js SSR application, not a static-only export. Adapter1.20.11 and Wrangler4.151.0 are pinned with Bun's lockfile.
- `open-next.config.ts` builds Next with Webpack. The tracked Bun patch includes `preview-props.json` in the adapter manifest loader; without it, the initial deployment threw a runtime exception.
- Web enables `global_fetch_strictly_public`. Without it, same-account Worker fetches returned404 even when the public API returned200. After enabling it, the actual published portfolio rendered in the browser. [Cloudflare Worker fetch](https://developers.cloudflare.com/workers/runtime-apis/fetch/) documents this routing option.

## Origins, secrets and mail exception

Web build-time `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WEB_URL` must match the deployed public HTTPS origins. Runtime `API_URL` selects the server-side public API. Runtime variables do not retroactively change compiled public variables.

API `API_URL`, `WEB_URL`, `NODE_ENV=production` and `DB_CONNECT_TIMEOUT_MS=20000` are in Wrangler vars. `DATABASE_URL`, `BETTER_AUTH_SECRET` and R2 credentials are encrypted Workers Secrets, transferred with explicit human approval. Never put actual secret values, session cookies, personal account exports or source CV data in Git or docs. Local secret files and adapter output remain ignored.

The human explicitly authorized signup without email verification for this trial because no SMTP provider is configured. API Wrangler sets `TRIAL_SKIP_EMAIL_VERIFICATION=true`; its environment default is false. Production HTTPS origins, secure cookies, session checks and ownership checks remain enabled. Reset/resend operations still report unavailable mail; no sending or recipient delivery was proven. Before a general launch, configure and verify mail, set the flag false and redeploy. This is a temporary testing exception, not a blanket launch policy.

R2 CORS was updated to allow the exact trial frontend origin alongside the existing localhost origin, retaining PUT, Content-Type, exposed ETag and max age3600. The bucket remains private. A successful CORS update is not proof of a hosted authenticated upload completing.

## Repeatable build and deployment

Use the independent checkout or a clean build directory so OpenNext's `.next` output does not interfere with a running local editor. Install the frozen Bun lockfile so the adapter patch applies. These commands are operational examples, not authorization to redeploy or a record that they were run again:

```sh
bun install --frozen-lockfile
NEXT_PUBLIC_API_URL=https://trial-api.example.com NEXT_PUBLIC_WEB_URL=https://trial-web.example.com bun run --cwd apps/web build:cloudflare
bunx --no-install wrangler deploy --config apps/web/wrangler.toml --dry-run
bunx --no-install wrangler deploy --config apps/api/wrangler.toml --dry-run
```

After reviewing changes and receiving any required deployment authorization:

```sh
bunx --no-install wrangler deploy --config apps/api/wrangler.toml
bunx --no-install wrangler deploy --config apps/web/wrangler.toml
```

A first API deployment additionally needs approved secret provisioning through Wrangler's secret commands or a private ignored secrets file. Do not place values on visible command lines. Normal redeployments retain existing Workers Secrets; inspect the target and configuration before updating. Builds alone do not establish database, auth or provider success.

## Recorded evidence and remaining acceptance

- Guarded Bun suite:17 pass,0 fail,799 assertions after Workers compatibility changes. API/web typechecks and Biome passed. These are historical checks, not rerun by the documentation task.
- Actual local workerd: native signup/signin, owned draft persistence, cross-account denial, transactional publication/public projection,12 concurrent request scopes and non-admin denial. Eight local Images cases covered valid PNG/JPEG/WebP, MIME mismatch and invalid inputs.
- Live API: health/readiness200, anonymous private/admin401, published projection200; readiness reported storage configured and mail disabled.
- Live web: initial manifest exception fixed; subsequent public SSR404 fixed. Human account sign-in, draft save/reload and public rendering were observed. A fictional Arabic account completed hosted signup, content save, appearance, publish and separate public-page scrolling.
- Live authenticated R2 upload/verification/rendering on the Workers deployment, full corrupt/animated-image matrix, remote CI, broad browser/accessibility matrix, real mail, scheduled retention/backups and monitoring remain unverified or incomplete. Do not report them as passed.

Private evidence remains in ignored `work/worker-http-evidence.json`, `work/worker-images-evidence.json`, `work/cloudflare-live-http.json` and screenshots/video captures. `work/cloudflare-web-live.json` records the intermediate404 before the routing fix; later browser/HTTP proof supersedes it. Never upload these private artifacts wholesale.

## References

- [Cloudflare OpenNext configuration](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)
- [Workers Node.js compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)
- [Workers fetch routing](https://developers.cloudflare.com/workers/runtime-apis/fetch/)
- [Workers Images binding](https://developers.cloudflare.com/images/transform-images/bindings/)

## JSON restore frontend update — 2026-10-15
Frontend rebuilt and redeployed after five focused parser tests, typechecks/Biome and guarded local browser restoration/cancel/ownership/persistence/public-isolation proof. Root, existing public portfolio and new client chunk returned200 through curl; new restore labels were present in the deployed chunk. Authenticated hosted restoration was not repeated on the real owner account. No API deployment, secret update or schema change. Local fixture cleanup removed2 generated users with0 remaining. See STATUS for precise evidence and remaining general-launch limits.

## Local-only media investigation — 2026-10-15
- No new deployment. The human explicitly chose local-only work; prior versions above remain authoritative. Automatic review rejected a deployment and later a hosted-copy diagnostic; neither executed.
- Initial bounded disposable fixture before that decision: authenticated intent200, generated PNG PUT200, completion502 STORAGE_PROVIDER_ERROR. Local workerd subsequently read the same staging bytes with HEAD200/GET200;174 bytes matched. Local Images decoded48x48. Exact hosted phase remains unknown; no claim that Images billing, CORS or any particular S3 operation caused it.
- Source adds safe storage phase/code diagnostics without signed URLs/keys/provider messages. These remain undeployed. Local UI/guarded lifecycle proof covers removal, deletion cleanup and retained releases with simulated storage transport; it is not live hosted upload/delete acceptance.
- Future authorized rollout must update API before web for the additive optional visual fields; old API parsing may discard new appearance preferences. No DDL migration or secret transfer is needed for these source changes. Complete live decoding/copy/render and bounded deletion/fixture cleanup before marking hosted media accepted.

## Custom domain checklist

Prepared 2026-10-20 for the human-owned test domain. **Every operational action below is NOT YET PERFORMED.** The edited non-secret Wrangler vars are preparation, not evidence that the deployed workers changed. Historical trial evidence above remains historical. Worker names, bindings, secrets and live resources were not changed.

- [ ] **NOT PERFORMED:** add Workers Custom Domain `lord2ve.tech` to web Worker `foliocraft-trial`, and `api.lord2ve.tech` to API Worker `foliocraft-api-trial`. No domain routes have been added to the local manifests. Human performs domain/DNS/TLS configuration later.
- [ ] **NOT PERFORMED:** configure API worker runtime `API_URL=https://api.lord2ve.tech`, `WEB_URL=https://lord2ve.tech`, retaining `NODE_ENV=production` and existing separately reviewed non-origin settings. Exactly one web origin; no www, wildcard, comma-separated list or trailing slash. Do not transfer or rotate secrets as part of this checklist.
- [ ] **NOT PERFORMED:** configure web worker runtime `API_URL=https://api.lord2ve.tech`; rebuild web with `NEXT_PUBLIC_API_URL=https://api.lord2ve.tech` and `NEXT_PUBLIC_WEB_URL=https://lord2ve.tech` in the build environment. Public values are compiled; editing runtime vars alone is insufficient. Any build/deployment needs separate authorization.
- [ ] **NOT PERFORMED:** replace the private R2 bucket CORS policy with this exact dashboard JSON for direct presigned uploads. This grants browser PUT from the canonical origin only; it does not make the bucket public. No R2 operation was executed here.

```json
[
  {
    "AllowedOrigins": ["https://lord2ve.tech"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

- [ ] **NOT PERFORMED:** human configures a Cloudflare redirect matching hostname `www.lord2ve.tech` to `https://lord2ve.tech` with the original path/query and permanent301 status. Configure the redirect hostname/DNS/TLS there; do not add www to application CORS/trusted origins. No application alias is introduced. Existing workers_dev flags remain unchanged by this preparation; any later retirement of trial hostnames is a separate human operation.
- [ ] **NOT PERFORMED:** after separately authorized rollout, test actual browser sign-in/session cookie persistence/reload/sign-out, native MFA and forbidden-origin requests (including www); confirm Secure/HttpOnly/SameSite=Lax and absence of Domain on API cookies. No hosted-cookie acceptance is inferred from source review.
- [ ] **NOT PERFORMED:** test authenticated upload intent, actual browser R2 PUT, completion, published image rendering and disposable-fixture cleanup; verify ownership failures and private draft isolation. Test a published site and ensure unpublished/suspended content remains unavailable.
- [ ] **NOT PERFORMED:** inspect canonical/OpenGraph links, `/robots.txt`, `/sitemap.xml` and published per-site sitemap URLs; all web URLs must derive from `NEXT_PUBLIC_WEB_URL=https://lord2ve.tech`, with public assets using the configured API origin. Confirm runtime SSR reaches the API subdomain.

Code evidence, cookie inference, full legacy-hostname inventory and search exclusions are in [CUSTOM_DOMAIN_REVIEW.md](CUSTOM_DOMAIN_REVIEW.md). JSON shape follows [Cloudflare R2 CORS documentation](https://developers.cloudflare.com/r2/buckets/cors/).
