# Ichnara API

An independent backend using Bun, Hono, Better Auth, PostgreSQL, and Drizzle. Start at `src/server.ts` for execution and `src/app.ts` for route and protection composition. Database rules live in services, request validation in routes, and schema and migrations in db.

Routes are grouped into `routes/admin`, `routes/sites` and `routes/public`, each with an index that composes its children. Administrator site moderation, resources and audit routes are actual modules inside `routes/admin`, behind the same administrator gate.

Site services live in `services/sites`: `draft-service.ts` owns drafts/ownership/revisions; `release-service.ts` owns publication/history; `public-service.ts` reads published releases. Administrative domain rules live in `services/admin`. Better Auth configuration/hooks/mail live in `lib/auth`; storage and environment-specific image decoders live in `lib/storage`. Keep the Bun import and Wrangler alias aligned when moving decoder modules.

Run from the root with `bun run dev:api`. Environment examples are in `.env.example`; actual configuration stays in the ignored `.env`. The backend runs without Next.js. Data tests use root `bun run test`, which guards folio_test and rejects Neon or production databases.

The browser fixture is in `tests/fixtures/browser-server.ts`, outside runtime source. It runs through the guarded wrapper and handles shutdown signals to clean up only its generated accounts. Do not run it with inherited development settings.

Cloudflare execution uses `src/worker.ts` and `wrangler.toml`, retaining the same Hono routes and services. Its PostgreSQL pool and Images binding are request-scoped; the image-validation import maps to a Workers decoder while Bun retains Sharp. The deployed trial temporarily permits unverified signup by explicit human approval; the default flag is false. See [CLOUDFLARE](../../docs/CLOUDFLARE.md) for deployment and remaining provider acceptance.

See the [source guide](../../docs/SOURCE_STRUCTURE.md), [API contract](../../docs/API.md), [operations](../../docs/OPERATIONS.md), and [actual status](../../docs/STATUS.md).
