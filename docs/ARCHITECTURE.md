# Current architecture

## Repository
```text
apps/web/               Next.js; independently deployed frontend
apps/api/               Bun + Hono; independently deployed backend
packages/contracts/     Zod schemas and stable API types, no DB secrets
packages/portfolio/     fixed renderer, semantic theme tokens, font registry
docs/                   canonical project memory
```
One shared repository is implemented; it does not require shared deployment. Public pages can render server-side in Next.js while consuming the independent API. No Next.js business backend or frontend direct database access.

## API source ownership
`app.ts` composes middleware and routes; `server.ts` owns Bun execution; `worker.ts` owns the additive Cloudflare request entry, edge client identity and request-scoped database/Images bindings. Routes validate input and call the responsible service. Routes are grouped into routes/admin, routes/sites and routes/public, with domain composition indexes. Site services live in services/sites: draft-service, release-service and public-service own drafts, publication and public reads. Administrative rules live in services/admin. Better Auth configuration/hooks/mail live in lib/auth and storage/decoder helpers in lib/storage. See [SOURCE_STRUCTURE.md](SOURCE_STRUCTURE.md) for actual file names and details.

## Data model
Better Auth owns user/session/account/verification/rate_limit. Actual domain tables are sites, releases, assets, inquiries, rate_buckets, and admin_audit. Site content is a validated Draft aggregate stored in JSONB: profile/projects/experiences/education/skills/articles/appearance/visibility, rather than a separate table per collection. Ownership, revisions, and documented constraints protect sites, releases, and assets; publication copies an immutable snapshot within a PostgreSQL transaction. The reorganization made no schema or data migration changes.

## Auth/access
Better Auth lives in API with Drizzle PostgreSQL adapter. Default production email/password requires verification and supports reset; actual mail provider setup remains open. The friends trial used TRIAL_SKIP_EMAIL_VERIFICATION=true until 2026-10-22; the manifests now set false (the default), so the trial requires verification after its next API deployment. Mail uses Resend over HTTP. Do not copy Expo/native social flow from the reference project into a web product. Backend reads session from request headers and enforces ownership for every private query/mutation. Do not allow body ownerId to define authorization. Better Auth endpoint bodies retain its native client contract rather than custom envelope.

The trial uses separate web/API HTTPS origins on the temporary custom domain (https://lord2ve.tech and https://api.lord2ve.tech; the API sets host-only cookies on the API host); exact allowed origins, credentials and cookies must match each environment. Inspect current Better Auth documentation and test actual browser cookie/session behavior. Restrict auth cookies to necessary hosts and avoid exposing dashboard cookies to user portfolio subdomains. Use CSRF/origin protections. Server-rendered public requests need no private session. The private studio uses credentialed browser API requests; public SSR forwards no private session. No secrets in client bundles.

## API outline
- Better Auth managed /api/auth/*
- GET /api/me
- POST /api/sites; GET/PATCH /api/sites/:siteId
- GET/PATCH /api/sites/:siteId/profile
- CRUD /api/sites/:siteId/projects, experiences, education, skills, articles
- GET/PATCH /api/sites/:siteId/appearance
- POST /api/sites/:siteId/assets/upload-intent; POST .../assets/:id/complete
- GET /api/sites/:siteId/preview (owner only)
- POST /api/sites/:siteId/releases; GET .../releases
- POST /api/sites/:siteId/unpublish; POST .../releases/:releaseId/activate
- GET /api/public/sites/:slug; published project/article lookups
- POST /api/public/sites/:slug/inquiries

Use reference-style status/result/error/code envelope for domain APIs, stable machine codes and field errors; frontend translates copy. Correct HTTP status codes, bounded pagination, request IDs. Draft revision conflicts return 409. Release activation must check ownership. Public payloads are explicit DTOs; never serialize private DB rows wholesale.

## Transactions/publication
Implemented pg/Drizzle PostgreSQL driver with real transaction support. Bun uses an application pool; Workers use an AsyncLocalStorage-selected request pool with max1, closed in finally. Local workerd transaction/concurrent-request proof is recorded in CLOUDFLARE and STATUS. Snapshot schema is versioned. Capture a consistent validated draft and its verified assets, insert immutable release, update published pointer in a transaction. Concurrent publish uses locking/revision checks. Repeat requests should not create unintended duplicate releases. Public responses currently use no-store. Any future cache must key by site/release identity and prove invalidation; retries cannot expose drafts. Rollback changes active pointer. A website publish is a data release, not a separate full application deployment per user.

## Assets
S3-compatible storage uses configured private Cloudflare R2, supplied and authorized by the human. Bun validation uses Sharp; Workers validation uses the request-local Cloudflare Images adapter. Presigned uploads with owner/site scoped keys, upload-intent records and post-upload object verification before attachment/publication. Verify size/type and decode images where appropriate; client MIME alone is insufficient. Private draft access, explicit published delivery, constrained URL protocols and rich-text sanitization. Cleanup respects references from retained releases.

## Frontend
Next.js App Router/React/TypeScript with controlled fields and custom UI components. Shared validation and data contracts use Zod. Current translations are per-feature Arabic/English dictionaries with real RTL/LTR support; the editor uses constrained text blocks, not stored HTML. React Hook Form/Tiptap/next-intl/shadcn were initial proposals and were not added to this implementation. The administration console reads its data through TanStack Query (a session-scoped client in `admin-query.tsx`; lists page through `useInfiniteQuery`) and renders with its own component kit in `features/management/admin/ui/`; shadcn/ui was considered and not adopted (it needs Tailwind and would duplicate the existing tokens and RTL controls). The studio editor keeps its own draft/revision controller; its Account page uses Better Auth's own account endpoints.

`app` owns only routing/metadata; `features` owns Studio, content, assets, management, and preview. `components/ui` holds reusable controls; `lib` holds clients and metadata helpers; `styles` holds CSS in deliberate cascade order. The fixed public/preview renderer lives in packages/portfolio, and appearance does not change persona or content. See SOURCE_STRUCTURE for responsibilities and development guidance.

## Deployment/operations
The authorized Cloudflare-only trial runs the independent API as a Hono Worker and web as a Next.js OpenNext Worker. Local Bun execution remains supported. Exact targets, tooling, manifest patch, public-fetch routing fix and remaining gates are documented in [CLOUDFLARE.md](CLOUDFLARE.md). PostgreSQL uses the human-selected Neon with the transaction-capable pg driver; mail provider remains open. Local dev DB and local mail testing preferred for autonomous proof without production secrets. R2 credentials are configured in hidden server env, and live provider/local browser proof passed; exact trial-origin CORS has been configured, while live hosted upload acceptance remains pending. Adapters must report integration state honestly. Health/readiness, structured errors, graceful shutdown, backup/restore plan and CI typecheck/lint/tests. Shared/distributed rate limits or durable jobs required before multi-instance features rely on cross-process state; don't adopt PM2 clustering from reference by default.

## Links to verify during implementation
- https://hono.dev/docs/
- https://bun.sh/docs
- https://www.better-auth.com/docs
- https://orm.drizzle.team/docs/overview
- https://nextjs.org/docs/app
- https://ui.shadcn.com/docs/rtl

## Current slice implementation
- Draft/profile/projects/appearance stored as one validated aggregate, revisioned by atomic compare-and-swap update; publication locks the owned site, snapshots it, reuses same-revision release and updates public pointer in the same transaction.
- API public DTO selects only immutable snapshot/release identity. No private owner/account fields. Public requests currently no-store; caching deliberately deferred until invalidation has evidence.
- Neon selected by user. Secrets only ignored local environment; web uses API URLs without database credentials.
- Better Auth 1.7.7 explicit @better-auth/drizzle-adapter, pg provider, transactions enabled. Core auth schema manually matched to documented core fields; native account/session runtime validated by integration tests when recorded in STATUS.
- Current editors/renderer support structured plain-text rich blocks, verified owned assets, galleries, experiences, education, skills and articles. Blank rich blocks preserve the plain body fallback. Shared fixed-width scaled preview and public details reuse portfolio components; public details require matching release identity. All selectors use SelectControl. Published asset redirects permit cross-origin embedding only after validated successful issuance; private/default responses remain same-origin.
- Local cross-origin web/API share localhost hostname and use credential cookies with exact trusted origins; hosted trial sign-in, owner save/reload and fictional signup/publication were observed. Comprehensive cookie/security/device acceptance and real mail remain separate gates.

## Current measured UI and discovery
Self-hosted fonts, type/spacing tokens and actual-size private preview are described in DESIGN_SYSTEM.md. Metadata/canonical/share current available covers consume published projection only. Cursor-based public slug/date discovery reuses moderation eligibility, XML index and per-site sitemap avoid private/draft pages. No-store retained. Database server statement deadline and separate client read deadline prevent silent unbounded wait;503 errors retain truthful failure semantics, not replay success. See STATUS for actual evidence and limits.

## Independent authentication pages — 2026-10-16
The product introduction links to /login and /signup. Their shared auth feature owns native Better Auth requests, visible request feedback and authenticated workspace redirects. Studio owns session-aware workspace composition and coupled saves, without embedded credential forms. URL interface locale is independent of saved portfolio locale. The landing template action reuses the shared native expanded-preview modal; fictional content never becomes a published site.

## Platform administration boundary — 2026-10-16
/ is the product landing; /studio owns personal portfolio editing; /admin and sites/accounts/activity child routes own platform management. The shared client layout withholds administrative children for anonymous/ordinary sessions, while existing backend/native authentication gates authorize all data and mutations independently. Administrative aggregates retain their real semantics, including publication pointers on suspended sites. UI role/self-ID confirmations supplement backend checks.

Studio administration navigation awaits revisioned draft saving and blocks departure on invalid input. Admin management dialogs reuse native focus containment and the shared select's dialog-aware portal. Shared login chooses only /studio or the fixed /admin return intent. No independent admin backend, new role hierarchy or schema is introduced.


## Admin Console P1 — 2026-10-18

The shared pure policy is packages/contracts/src/admin-policy.ts, exported as @ichnara/contracts/admin-policy. API lib/auth/access.ts merges Better Auth defaultStatements with its resources and derives native role objects from the same grants. middleware/admin.ts checks the authoritative staff session and actual matched endpoint permission declarations; each route also uses requirePermission. Tests enumerate the real mounted Hono routes and reject undeclared/overlapping endpoints. There is no admin alias or automatic role conversion.

Hono intercepts external native-admin HTTP before Better Auth. Domain account read wrappers use in-process auth.api methods and mask/sanitize their output; internal before-hook and test-probed after-hook execution are verified. No authorization capability, bypass header or new AsyncLocalStorage authorization context is used. The existing request database context remains unchanged. Native account mutations await P2; impersonation/password setting are disabled for all roles. The current console consumes /me/permissions, hides forbidden sections, blocks direct forbidden pages and requests only authorized data. Admin HTML is request-rendered with no-store/noindex. ADMIN_CONSOLE.md documents approval precedence, actual P1 acceptance and P2 limits.

## Admin P2b-2a — 2026-10-19

Sensitive account domain wrappers use native Better Auth methods with strict expanded password/reason bodies, independently enforced/stripped by the project before hook. Shared services/admin/sensitive-action.ts supplies ordinary-target/session ownership resolution, current actor/TOTP/permission checks, native operator-password verification, durable attempted/outcome inserts and scoped database denial budgets. Auth hooks carry only sanitized per-invocation audit correlation to their after hook; they do not accept a trusted authorization marker. Site moderation shares preparation and retains transactional state/succeeded-outcome writes after a separate durable attempt. No new schema, migration, freshness policy or authorization context. See ADMIN_CONSOLE appendix15 for design comparison, actual checks and separate failure boundaries. Earlier statements that all native account mutations await P2 are superseded only for this batch's four ordinary-target account operations; deferred operations remain closed.

## Reports — P3 (2026-10-19)

content_reports is an additive domain table. routes/public/reports.ts owns strict bounded anonymous intake; routes/admin/reports.ts declares reader/handler grants; services/reports.ts owns salted address hashing, quotas, transactional dedup, minimized DTOs, ascending timestamp(3)/UUID cursor and audited terminal transitions. REPORT_IP_SALT is server-only and production-required; no raw address is persisted. Request-pool max1 is respected by using the transaction executor for all transactional work. The duplicate-only advisory transaction lock is unrelated to deferred P2 role/last-owner operations.

packages/contracts/src/reports.ts shares request/type declarations without database imports. Shared Portfolio accepts a reportAction slot; published home/detail routes inject the same client form, while preview shares the renderer without a live report action. Public authentication/cache policy stays unchanged. Administrative reports reuse the shell/selects/native dialog and existing site moderation controller in dialog-only mode, maintaining separate site-action and report-closure acknowledgments. See ADMIN_CONSOLE17 and OPERATIONS for actual limits and unverified production/retention dependencies.
