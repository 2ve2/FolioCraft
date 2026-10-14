# Cloudflare-only trial deployment

Status: configuration scaffolding, not a completed deployment. No public FolioCraft trial URL has been issued or verified.

## Deployment targets

- `apps/api/wrangler.toml`: `foliocraft-api-trial`, using the additive Hono Worker entry in `src/worker.ts`. Local Bun startup remains `src/server.ts`.
- `apps/web/wrangler.toml`: `foliocraft-trial`, serving the full application through generated OpenNext output and static assets. The repository currently does not contain an installed OpenNext adapter or generated `.open-next` output.
- Keep existing Neon PostgreSQL and private R2 assets. No schema migration, account-content change, public draft exposure, or existing Cloudflare project replacement is part of this deployment.

The human requires free Cloudflare hosting that runs with their computer off. No tunnels, external backend hosts, paid Containers, purchases, or plan upgrades are authorized.

## Required compatibility gates

1. Install a maintained Wrangler version and an adapter verified against installed Next.js16.4.0/React19.3.0; use Bun and commit package/lockfile changes separately. Global Wrangler3.109.1 is not sufficient evidence of compatibility with the current runtime/configuration.
2. Build and preview the frontend in the actual Workers runtime. Preserve SSR public pages and private editor behavior; a static-only export is not equivalent.
3. Give each Workers request its own PostgreSQL connection lifecycle. Current application-wide Bun pg pool must not be assumed safe across independent Workers requests. Verify real publication transactions and concurrent request isolation.
4. Replace native Sharp only in the Workers target with a verified compatible full-image decoder. Retain MIME, dimensions, page-count, byte bounds, corruption checks and exact-byte conditional R2 copy. Metadata-only acceptance is not an acceptable replacement.
5. Configure and prove actual verification/reset delivery. Current production startup requires complete mail configuration; do not bypass verification or fabricate delivery for the trial.
6. Review free-plan CPU/bundle/memory limits against authentication and image verification workloads. Reject unsupported deployment rather than silently dropping features or upgrading the account.
7. Set final HTTPS origins, trusted edge-client handling and secure cookies. Prove sign-in, ownership, draft save, publication, inbox and admin access from the deployed frontend.

## Configuration and secrets

API runtime settings include API_URL, WEB_URL, DATABASE_URL, BETTER_AUTH_SECRET, pool/deadline settings and complete configured mail/storage groups. Keep credentials exclusively in Cloudflare Workers secrets, never Wrangler vars, source files, logs or Git. Supply reviewed origin values before runtime initialization; the starter configuration deliberately includes no credentials or guessed origin.

Frontend NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WEB_URL are build-time public origins. Its server-side API_URL must refer to the independently deployed API. Runtime vars alone cannot retroactively change compiled NEXT_PUBLIC values.

Wrangler local logs and temporary build outputs belong in ignored work/ or ignored adapter folders. Any .dev.vars files remain ignored. Run dry builds before a network deployment:

```sh
# From each app directory, after installing compatible project-local tooling.
bunx --no-install wrangler deploy --dry-run
```

No upload succeeds merely because these files exist. Record actual compiler, runtime and provider evidence in STATUS before declaring the trial available.

## References

- [Cloudflare OpenNext configuration](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)
- [Workers Node.js compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)
- [Workers PostgreSQL connections](https://developers.cloudflare.com/workers/tutorials/postgres/)
- [Workers pricing and free limits](https://developers.cloudflare.com/workers/platform/pricing/)

