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
`app.ts` composes middleware and routes; `server.ts` owns Bun execution. Routes validate input and call the responsible service. Drafts live in siteDraftService, publication and history in releaseService, and public reads in publicSiteService. Better Auth configuration is in lib/auth.ts; authorization and audit hooks are in lib/auth-hooks.ts. See [SOURCE_STRUCTURE.md](SOURCE_STRUCTURE.md) for actual file names and details.

## Data model
Better Auth owns user/session/account/verification/rate_limit. Actual domain tables are sites, releases, assets, inquiries, rate_buckets, and admin_audit. Site content is a validated Draft aggregate stored in JSONB: profile/projects/experiences/education/skills/articles/appearance/visibility, rather than a separate table per collection. Ownership, revisions, and documented constraints protect sites, releases, and assets; publication copies an immutable snapshot within a PostgreSQL transaction. The reorganization made no schema or data migration changes.

## Auth/access
Better Auth lives in API with Drizzle PostgreSQL adapter. Initial default is email/password with verification/reset; actual provider/email setup remains open. Do not copy Expo/native social flow from Sooqha into a web product. Backend reads session from request headers and enforces ownership for every private query/mutation. Do not allow body ownerId to define authorization. Better Auth endpoint bodies retain its native client contract rather than custom envelope.

Proposed sibling hosts app.example.com and api.example.com; exact allowed origins, credentials and cookie settings per environment. Inspect current Better Auth documentation and test actual browser cookie/session behavior. Restrict auth cookies to necessary hosts and avoid exposing dashboard cookies to user portfolio subdomains. Use CSRF/origin protections. Server-rendered public requests need no private session. Private SSR forwards only necessary authentication to the known API origin. No secrets in client bundles.

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

Use Sooqha-style status/result/error/code envelope for domain APIs, stable machine codes and field errors; frontend translates copy. Correct HTTP status codes, bounded pagination, request IDs. Draft revision conflicts return 409. Release activation must check ownership. Public payloads are explicit DTOs; never serialize private DB rows wholesale.

## Transactions/publication
Default pg/Drizzle PostgreSQL driver with real transaction support; finalize compatible driver after inspecting installed tooling. Snapshot schema is versioned. Capture a consistent validated draft and its verified assets, insert immutable release, update published pointer in a transaction. Concurrent publish uses locking/revision checks. Repeat requests should not create unintended duplicate releases. Cache public responses by site/release identity, invalidate by backend event or authenticated revalidation hook; retries cannot expose drafts. Rollback changes active pointer. A website publish is a data release, not a separate full application deployment per user.

## Assets
S3-compatible storage; Cloudflare R2 is a style-aligned candidate, provider not human-confirmed. Presigned uploads with owner/site scoped keys, upload-intent records and post-upload object verification before attachment/publication. Verify size/type and decode images where appropriate; client MIME alone is insufficient. Private draft access, explicit published delivery, constrained URL protocols and rich-text sanitization. Cleanup respects references from retained releases.

## Frontend
Next.js App Router/React/TypeScript with controlled fields and custom UI components. Shared validation and data contracts use Zod. Current translations are per-feature Arabic/English dictionaries with real RTL/LTR support; the editor uses constrained text blocks, not stored HTML. React Hook Form/Tiptap/next-intl/shadcn were initial proposals and were not added to this implementation.

`app` owns only routing/metadata; `features` owns Studio, content, assets, management, and preview. `components/ui` holds reusable controls; `lib` holds clients and metadata helpers; `styles` holds CSS in deliberate cascade order. The fixed public/preview renderer lives in packages/portfolio, and appearance does not change persona or content. See SOURCE_STRUCTURE for responsibilities and development guidance.

## Deployment/operations
Web hosting candidate Vercel. Bun API needs a Bun-compatible server/container host, yet to be selected. PostgreSQL uses the human-selected Neon with the transaction-capable pg driver; mail provider remains open. Local dev DB and local mail testing preferred for autonomous proof without production secrets. R2 credentials are configured in hidden server env, and live provider/local browser proof passed; final production origin remains pending. Adapters must report integration state honestly. Health/readiness, structured errors, graceful shutdown, backup/restore plan and CI typecheck/lint/tests. Shared/distributed rate limits or durable jobs required before multi-instance features rely on cross-process state; don't adopt PM2 clustering from reference by default.

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
- Local cross-origin web/API share localhost hostname and use credential cookies with exact trusted origins; production sibling-domain cookie behavior remains unverified until deployment configuration exists.

## Current measured UI and discovery
Self-hosted fonts, type/spacing tokens and actual-size private preview are described in DESIGN_SYSTEM.md. Metadata/canonical/share current available covers consume published projection only. Cursor-based public slug/date discovery reuses moderation eligibility, XML index and per-site sitemap avoid private/draft pages. No-store retained. Database server statement deadline and separate client read deadline prevent silent unbounded wait;503 errors retain truthful failure semantics, not replay success. See STATUS for actual evidence and limits.
