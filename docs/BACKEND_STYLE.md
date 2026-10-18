# the reference project backend reference findings

Inspected read-only on 2026-10-13: `<read-only reference backend>`.
This is a reference for style, not the new application's production backend. No reference files changed; no secrets/env files read; no code, migrations or production commands executed.

## Observed files and reusable patterns
| Evidence | Observed pattern | Portfolio application |
|---|---|---|
| package.json | Bun scripts, Hono, Better Auth, Drizzle, Biome, S3 SDK | Same core stack; independently choose compatible maintained versions |
| src/app.ts | Hono composition, cors, errors, protected route registration | Thin app composition with explicit private/public routes |
| src/server.ts | Bun.serve runtime separate from app | Separate startup from API testable app |
| src/routes/favorites.ts | request schemas, session context, service calls, ownership check | Route boundaries validate and authorize |
| src/services/favoriteService.ts | service object; Drizzle selects/inserts; pagination | Simple cohesive service objects and typed queries |
| src/middleware/auth.ts | auth.api.getSession(headers), session in Hono context | Typed session middleware for private site operations |
| src/lib/auth.ts | Better Auth + drizzleAdapter; env/provider gating | Adapter/session organization; web-specific config |
| src/lib/response-helpers.ts | status/result or error/code envelope and HTTP statuses | Domain API response contract; retain native auth protocol |
| src/db/index.ts; src/db/schema/* | central DB instance and schemas by domain | Central transaction-capable PostgreSQL instance |
| biome.json | tabs, double quotes, semicolons, 100-char lines, import organization | Follow stylistic intent with a version-compatible Biome config |
| CLAUDE.md; docs/decisions-log.md | startup reading and explicit evidence/action/decision logs | New AGENTS.md, docs/STATUS/DECISIONS/CHANGELOG |

## Details not to transplant
- Reference uses drizzle-orm/neon-http. For portfolio publishing, verify real multi-statement transactions using the chosen driver. Do not send BEGIN/ROLLBACK as unrelated HTTP statements.
- Reference server uses PM2 reusePort/websocket setup. Portfolio MVP does not require this topology.
- Reference docs flag in-process state limitations across workers; do not copy queues/limits as globally reliable by assumption.
- Expo plugin/native idToken providers and marketplace-specific auth/data constraints are unrelated to this web product.
- Marketplace admin password headers, listings/geographic fields, messages, names, domains, secrets and production resources must not migrate.
- Local route try/catch database mappings may be centralized where helpful; keep error contract consistent without replicating accidental duplication.
- Storage object attachment must validate ownership even if a reference path does not enforce it.
- Reference versions are observed facts, not a requirement to pin old versions (e.g. Better Auth 1.4.22).

Observed style should inform implementation; it does not mean the reference is audited or all behaviors are best practice. Any meaningful deviation belongs in DECISIONS.md with rationale.

## Additional source inspection — R2, composition and database values
- `src/lib/r2.ts` exports one S3Client with region `auto` and an account-derived Cloudflare endpoint. `services/uploadService.ts` owns upload operations, documented functions and scoped object keys generated with `createId()` from `@paralleldrive/cuid2`.
- Reference presigned PUT returns URL/key/method/headers, omits ContentLength to avoid signature mismatches, then checks object size through HeadObject. Portfolio must retain actual image decoding, ownership validation and immutable verified copies; evaluate signing compatibility through a real R2 browser test before changing it.
- Reference `app.ts` composes imported security, payload, rate and auth middleware and separate domain routes; `server.ts` owns runtime startup. Portfolio middleware is now extracted into middleware/http.ts and runtime routes; app.ts composes and server.ts owns startup.
- Auth and domain entity IDs are text primary keys generated with CUID2 in services. Category/city/region dictionary IDs use serial values. Existing portfolio UUID identifiers and foreign references have **not** been converted; conversion requires an explicit preservation/compatibility plan.
- Typical reference timestamps use `timestamp(...).$defaultFn(() => new Date()).notNull()` and explicit service updates with `new Date()`. Observed timestamps lack `withTimezone`; this is a JavaScript default, not SQL defaultNow. Portfolio retains existing SQL defaults and timestamp representations deliberately; no standardization migration is planned in the current scope. See I05 compatibility policy, including explicit UTC ban-expiry SQL comparison.
- Follow the user's English explanations above functions and whitespace preference. Do not import marketplace shared-password admin logic, production domains, credentials or unsafe proxy assumptions.
