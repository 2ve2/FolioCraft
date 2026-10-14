# FolioCraft API

An independent backend using Bun, Hono, Better Auth, PostgreSQL, and Drizzle. Start at `src/server.ts` for execution and `src/app.ts` for route and protection composition. Database rules live in services, request validation in routes, and schema and migrations in db.

Site services are separate: `siteDraftService` owns drafts, ownership, and revisions; `releaseService` owns publication and release history; `publicSiteService` owns public releases. `siteService` is a small compatibility facade; do not add new implementation there. Authentication configuration is in `lib/auth.ts`; its rules and audits are in `lib/auth-hooks.ts`.

Run from the root with `bun run dev:api`. Environment examples are in `.env.example`; actual configuration stays in the ignored `.env`. The backend runs without Next.js. Data tests use root `bun run test`, which guards folio_test and rejects Neon or production databases.

The browser fixture is in `tests/fixtures/browser-server.ts`, outside runtime source. It runs through the guarded wrapper and handles shutdown signals to clean up only its generated accounts. Do not run it with inherited development settings.

Cloudflare execution uses `src/worker.ts` and `wrangler.toml`, retaining the same Hono routes and services. Its PostgreSQL pool and Images binding are request-scoped; the image-validation import maps to a Workers decoder while Bun retains Sharp. The deployed trial temporarily permits unverified signup by explicit human approval; the default flag is false. See [CLOUDFLARE](../../docs/CLOUDFLARE.md) for deployment and remaining provider acceptance.

See the [source guide](../../docs/SOURCE_STRUCTURE.md), [API contract](../../docs/API.md), [operations](../../docs/OPERATIONS.md), and [actual status](../../docs/STATUS.md).
