# Cloudflare-only trial deployment

> **Testing only:** The Cloudflare-hosted instance is a trial for friends to test and report issues. It is not a final launch or an accepted production release. Deployment to Cloudflare makes the test instance reachable; it does not establish production readiness.

Last reconciled: 2026-10-15, Asia/Riyadh. Deployment and browser initial evidence below was collected on 2026-10-14. The JSON restore frontend update and its HTTP checks were completed on 2026-10-15 as noted below.

## Deployed trial

- Web: https://foliocraft-trial.bdalrhmnmtwq53.workers.dev/
- API: https://foliocraft-api-trial.bdalrhmnmtwq53.workers.dev
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
NEXT_PUBLIC_API_URL=https://foliocraft-api-trial.bdalrhmnmtwq53.workers.dev NEXT_PUBLIC_WEB_URL=https://foliocraft-trial.bdalrhmnmtwq53.workers.dev bun run --cwd apps/web build:cloudflare
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
