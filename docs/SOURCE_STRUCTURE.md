# Source structure guide

## Studio startup — 2026-10-22

- `features/portfolio/portfolio-preview.tsx` measures the initial private preview scale before paint, avoiding a fallback-width flash.
- `features/studio/studio-skeleton.tsx` and `styles/studio-skeleton.css` render neutral account/draft blocks using the real header, sidebar, preview toolbar and extracted `sections/content-header.tsx`. The single live status sits outside the busy subtree.
- `features/studio/startup-site-read.ts` owns one in-memory speculative result, exact server/native session matching and cancellation. `use-startup-site-read.ts` subscribes before reading and handles native/store/storage/transient cross-tab invalidation. `lib/auth-client.ts` mirrors mutation signals without identity data or changed client options; unsupported channels retain the sequential path. `lib/api.ts` exposes the envelope while existing callers still receive only result.
- `packages/contracts/src/index.ts` exports the strict two-ID studioSessionSchema. `apps/api/src/routes/sites/drafts.ts` adds only the authenticated user/session record IDs to GET /api/sites through the existing response helper. The Site DTO and ownership middleware are unchanged.
- `apps/api/tests/studio-session.integration.test.ts`, web startup/skeleton tests and `e2e/studio-startup.spec.ts` cover requester binding,401, double-ID mismatches, held-response chrome, geometry, real sign-out and cross-tab cancellation, reduced motion and a working language switch.
- `e2e/fixtures.ts` owns the shared native rate-budget-aware openStudioSignedIn helper. Ready-workspace selectors exclude aria-busy skeletons to preserve existing session-test meaning. `scripts/test-e2e.ts` keeps child temporary files in project-owned work/e2e-tmp.

## Published portfolio ISR — 2026-10-22

- `packages/contracts/src/public-cache.ts`: bounded private protocol, reserved paths, site/slug tags and delivery receipts.
- `apps/api/src/db/schema/cache.ts` and migration0010 plus snapshot/journal: generation outbox and transactional site/owner/asset triggers. `services/cache-invalidation.ts` owns bounded delivery, acknowledgement, request target tracking and retries; `worker.ts` owns minute scheduling. Existing mutation services register authorized targets. `routes/public/sites.ts` exposes only the published cache DTO.
- `apps/web/portfolio-worker.ts`, `cache-scope.ts`, `portfolio-incremental-cache.ts`: runtime switch, reserved-path guard, private completion receipt, render-start provenance and filtering around official R2. `worker.ts` exports the private named entrypoint and generated DO; `cloudflare-runtime.d.ts` declares generated/runtime imports.
- `apps/web/src/app/(cached-portfolio)/ichnara-isr/p/[slug]`: internal root/project/article ISR composition; `src/lib/cached-portfolio.ts` validates immutable published DTOs and collects tags. `src/app/api/internal/revalidate-portfolio/route.ts` and `src/lib/revalidate-portfolio.ts` own strict secret-checked tag expiration. Original dynamic portfolio routes remain unchanged. Shared renderer stays in `packages/portfolio`.
- `apps/{api,web}/wrangler.cache.toml`: optional human-operated binding/resource manifests, separate from default-off normal deployment. Existing Bun patch adds observable faults, inclusive expiration and monotonic tag writes.
- `apps/api/tests/cache-invalidation.integration.test.ts`, `tests/fixtures/public-cache-runtime.ts`, `apps/web/tests/public-cache.test.ts`, `e2e/public-cache.spec.ts`: persistence, generated Worker faults/cache/races/timing, storage/auth policy and browser coverage. `scripts/local-public-cache-proxy.ts` is the local Node E2E boundary; `scripts/test-api.ts --public-cache-runtime` is the guarded generated-Worker runner. CI runs both browser and R2/DO acceptance.
- [PUBLIC_CACHE.md](PUBLIC_CACHE.md), [E2E.md](E2E.md) and dated evidence contain manual operations and actual verification. Ignored raw artifacts remain under `work/published-isr/`.

Last updated: 2026-10-16. This is the current source map; dated CHANGELOG entries describe earlier layouts.

## Independent applications

`apps/api` owns Bun/Hono/Better Auth/Drizzle and database access. `apps/web` owns Next.js and browser clients; it never imports backend credentials or database code. Shared contracts live in `packages/contracts`; public pages and private preview use the same `packages/portfolio` renderer.

`work/` contains ignored local evidence and the independent Git checkout used for commits. It is not runtime source. Generated build output, dependencies and provider settings are not feature modules. Cloudflare targets remain independently configured per application; see [CLOUDFLARE.md](CLOUDFLARE.md).

## Backend: routes by domain

```text
apps/api/src/
  app.ts                         Middleware and domain-router composition
  server.ts                      Bun process lifecycle
  worker.ts                      Cloudflare request entry and request scopes
  config/env.ts                  Validated configuration
  middleware/                    Session, administration, protections and errors
  routes/
    account.ts                   Account/site association
    runtime.ts                   Runtime status
    admin/
      index.ts                   Administrator gate and child-router composition
      sites.ts                   Site lookup, suspension and resumption
      resources.ts               Platform and selected-site resource counts
      audit.ts                   Administrative action log
      validation.ts              Moderation reasons and pagination validation
    sites/
      index.ts                   Private-site router composition
      drafts.ts                  Site creation, draft, address and settings
      assets.ts                  Owned media lifecycle
      inquiries.ts               Owned inquiry inbox
      releases.ts                Publication and release history
      content/
        index.ts                 Content-router composition
        profile.ts               Introduction and contact fields
        appearance.ts            Appearance preferences
        sections.ts              Section visibility and ordering
        projects.ts              Projects
        experiences.ts           Experience
        education.ts             Education and certificates
        skills.ts                Skill groups
        articles.ts              Articles
        shared/                  Collection route and validation helpers
    public/
      index.ts                   Public-router composition
      sites.ts                   Published releases
      assets.ts                  Published media
      inquiries.ts               Public inquiry submission
      sitemap.ts                 Published-site discovery
  services/
    sites/
      draft-service.ts           Ownership, revisions, drafts and settings
      release-service.ts         Atomic publication and release history
      public-service.ts          Published release reads
      content-service.ts         Content collection operations
      public-access.ts           Shared public availability predicate
    admin/
      site-service.ts            Administrative resources and site moderation
      audit-service.ts           Administrative action recording
    assets.ts                    Owned attachment and storage lifecycle
    inquiries.ts                 Inquiry rules
    rate-limit.ts                Atomic PostgreSQL limits
  lib/
    auth/
      index.ts                   Better Auth configuration and adapter
      hooks.ts                   Mail/permission rules and protocol audit
      mail.ts                    Configured real mail transport
    storage/
      index.ts                   Storage operations
      client.ts                  Storage client configuration
      image-validation.ts        Bun Sharp decoder
      image-validation.worker.ts Workers Images decoder
      worker-images-context.ts   Request-local Images binding
    response-helpers.ts          Domain response contract
    validation.ts                Identifiers and pagination
  db/
    index.ts                     Bun pool and Workers request-scoped database
    pool-diagnostics.ts          Allowlisted pool-error metadata (stage/ending/ended)
    hyperdrive.ts                Optional connection selector and origin deadline guard
    timing.ts                    Opt-in numeric request-local pg timings
    schema/                      Tables grouped by domain
    migrations/                  Explicit reviewable migrations
```

Routes validate requests and delegate to services; database rules do not belong in route handlers. `admin/index.ts` applies the administrator gate before mounting its children. Private operations retain ownership/session checks. Publication retains its transaction and immutable snapshot. Better Auth owns its protocol responses.

Callers import the responsible site service directly; there is no aggregating index. The `#image-validation` Bun import and Wrangler alias intentionally select different decoders; update both when moving their targets.

`db/pool-diagnostics.ts` owns the finite log projection. The pinned `patches/pg-cloudflare@1.4.1.patch` gives normal adapter `end()` a graceful writable close while preserving forced `destroy()`. It is installed by the frozen Bun lockfile and does not affect Bun sockets.

Guarded database tests live in `apps/api/tests`; `tests/fixtures/browser-server.ts` creates disposable local browser accounts through the root test wrapper. Never use that fixture against hosted databases. The root `scripts/test-api.ts` also runs `scripts/test-worker-database.ts` after the Bun suite (except browser-fixture mode); its `tests/fixtures/worker-database.ts` is a test-only Worker covering clean teardown, transaction/client reuse, 12 isolated concurrent clients, actual scheduled maintenance and an unexpected idle disconnect. It is not an application route.

## Frontend: feature ownership

```text
apps/web/src/
  app/                           Thin routes, metadata and layouts
    (platform)/[locale]/         Landing, auth, legal, studio and admin under /ar and /en
      layout.tsx                 Root layout: both languages prebuilt, <html lang/dir>, LocaleProvider
      [...missing]/page.tsx      Unknown paths under a prefix → that language's not-found.tsx
    (portfolio)/p/[slug]/        Published portfolio routes with their own root layout:
      layout.tsx                 <html lang/dir> from the published release locale (server-rendered)
      _public.tsx                Request-memoized public release reads shared by layout/metadata/page
    global-not-found.tsx         Branded 404 for unmatched URLs across both root layouts
    root-styles.ts               Shared font and globals.css imports for both root layouts
  components/ui/                 Shared controls, TooltipButton and local styles
  features/
    auth/
      auth-screen.tsx            Dedicated login/signup presentation
      use-auth-controller.ts     Native auth requests and workspace redirect
      auth.module.css            Responsive standalone auth layout
    studio/
      studio.tsx                 Screen and workspace composition
      use-studio-controller.ts   Session, recovery, save and publication coordination
      draft-errors.ts            Localized validation-path messages
      draft-import.ts            Bounded JSON backup parsing and normalization
      sections/
        content-section.tsx      Content-section composition
        profile-section.tsx      Profile/contact/social editor
        projects-section.tsx     Project editor
        appearance-section.tsx   Appearance controls
        settings-section.tsx     Address and backup settings
      account/
        account-settings.tsx     Account page: name, email change, password, devices, deletion
        account-copy.ts          Bilingual account copy and error messages
        account.module.css       Account page cards
      landing-page.tsx           Public entry and session-aware studio links
      welcome-screen.tsx         Product landing and independent auth-route links
      landing-showcase.tsx       Fictional shared-template example
      onboarding-screen.tsx      First-site creation
      workspace-*.tsx            Navigation, header and preview frame
      copy.ts, types.ts          Studio copy and contracts
    content/                     Dedicated collection/rich-content editors and helpers
    assets/
      asset-picker.tsx           Upload, library and selection actions
      asset-preview.tsx          Image preview and retry state
      use-asset-urls.ts          Session-scoped private URL renewal
      copy.ts, types.ts          Asset copy and contracts
      asset-picker.module.css    Local styles
    management/
      admin/
        admin-shell.tsx          Role-aware navigation, session gate and account exit
        admin-context.tsx        Authorized identity and interface-locale context
        admin-query.tsx          Session-scoped TanStack Query client, console reads, infinite lists and refresh
        ui/console.tsx           Console kit: page header, metrics, panels, tables, filters, states
        ui/console.module.css    Console kit styles (tables become stacked cards on phones)
        admin-pagination.tsx     Shared bounded twenty-record pagination
        site-moderation-dialog.tsx Site overview and password-confirmed moderation
        admin-dialog.tsx         Native modal lifecycle and focus restoration
        use-site-moderation.ts   Site overview read and guarded moderation mutation
        admin-copy.ts            Bilingual dashboard copy and audit action labels
        admin-shell.module.css   Navigation/session layout and responsive rules
        admin.module.css         Records, metrics and dialog styles
      site/site-operations.tsx   Inbox and release management
      shared/
        index.ts                 Shared helper exports
        errors.ts, date.ts       Error/date formatting
        pager.tsx, use-page.ts   Pagination UI and request state
        copy.ts, types.ts        Management copy and resource contracts
        management.module.css   Shared management styles
    portfolio/                   Preview integration and public inquiry form
  lib/                           API/auth clients, public metadata and interface language:
    locale.ts                    Languages, cookie name, localeHref, prefix parsing, negotiation
    locale-redirects.ts          next.config redirects for un-prefixed URLs (no proxy runtime)
    locale-metadata.ts           Per-language page titles (localizedMetadata)
    request-locale.ts            Visitor language for pages without a prefix (cookie, then browser)
    use-interface-locale.tsx     LocaleProvider, useInterfaceLocale (switching), useRoutePath
  styles/                        Ordered global styles
```

`use-studio-controller.ts` deliberately keeps coupled session/recovery/save/publication ordering together. Editors receive the controlled draft and update callback; do not add independent writes that bypass revision checks or operation locks. Presentation sections and pure validation formatting are separate from that algorithm. Administration requests and named handlers belong in its controller, not inline JSX.

Feature-specific components, copy, types and local CSS stay with their feature. Reusable controls belong in `src/components/ui`. Do not recreate obsolete empty top-level `apps/web/components`, `lib` or `public` scaffolding without actual files and responsibility.

## Shared renderer and styles

```text
packages/portfolio/src/
  index.tsx                      Stable package exports
  portfolio.tsx                  Fixed layout and section composition
  sections/
    hero.tsx                     Introduction/navigation
    projects.tsx                 Projects
    experience.tsx               Experience
    education.tsx                Education
    skills.tsx                   Skill groups
    articles.tsx                 Articles
    contact.tsx                  Contact/inquiry section
  portfolio-detail.tsx           Project/article detail layout
  appearance.ts                  Themes and typography variables
  copy.ts, format.ts, types.ts   Shared localized contracts and formatting
  section-elements.tsx          Headings and date ranges
  rich-content.tsx               Safe blocks and galleries
  link-arrow.tsx                 Shared locale-aware text-action arrow
  styles.ts                     Portfolio styles only
```

`app/globals.css` is an ordered import entry point: reset (layered base reset, formerly Tailwind preflight), tokens, foundation, welcome, landing, workspace, responsive, editor-groups, loading, select-control, readability, workspace-preview, workspace-scroll, scrollbars. `landing.css` follows `welcome.css` to preserve the extracted rules' cascade. Do not alphabetize imports.

TooltipButton owns covered action hints; avoid adding a second native title popup. Optional avatar/initials and decorative project-cover visibility belong in shared appearance contracts/rendering. Hiding a visual retains its asset references and lifecycle protections. Restored legacy backups normalize the earlier visual defaults.

## Readability and extension rules

- Give named functions a short English purpose description. Explain the operation and its responsibility rather than repeating the identifier.
- Separate named functions, route handlers and state groups with blank lines. Use route-specific descriptions and named UI actions for nontrivial callbacks.
- Keep files cohesive: composition in entry points, request state in controllers, domain rules in services, rendering in sections. Do not split coupled state transitions merely to reduce line count.
- Create a folder when it owns actual modules. Avoid empty scaffolding and duplicate forwarding layers.
- Keep HTTP paths, middleware order, package exports, ownership/transaction boundaries and preview/public rendering stable during structural refactors.

When adding a feature, update the shared contract first, then its owned route/service, controlled editor and shared renderer. Verify revisioned saving, account isolation, publication and both locales.

## Verification and limits

Use Bun from the root: `bun run check`, `bun run typecheck`, `bun run test`, and the documented web tests/build. The root database wrapper rejects production/remote databases. For a local fixture use `bun run test --admin-browser`; point both `API_URL` and `NEXT_PUBLIC_API_URL` at its local origin. `FOLIO_QA_BUILD=1` isolates web build output.

This refactor retained 108 deterministic renderer outputs and eight extracted administrative action AST bodies. Ordered CSS rules match, with only a blank newline at the extracted landing-file boundary. Test/build/browser evidence is recorded in STATUS/CHANGELOG; it does not establish hosted provider acceptance. Private comparison material is in `work/source-organization/`.

## Authentication entry routes

`app/login/page.tsx` and `app/signup/page.tsx` mount the shared auth feature with a fixed mode. WelcomeScreen contains only product introduction, example and links. Auth requests do not belong in the workspace save controller. The interface language is the URL prefix (`/ar`, `/en`): routes link with `localeHref`, and `lib/use-interface-locale.tsx` supplies it from the server-rendered layout and switches it with a soft navigation to the other prefix. This is interface state, never portfolio draft content.

Explore the template opens ExpandedPortfolioPreview through WelcomeScreen state; LandingShowcase supplies the same fictional draft/theme used by its inline preview. Reuse the modal focus/Escape/scroll handling instead of implementing a second overlay.

## Independent administration routes

`app/admin/layout.tsx` mounts AdminShell; its overview/sites/accounts/activity page modules mount the matching view only after the client session gate. Domain/native backend gates remain the security boundary. /studio owns the personal editor; / always mounts LandingPage. Auth normally returns to /studio; only the fixed from=admin intent selects /admin.

Administration no longer appears as a Studio section type. The Studio navigation action awaits the controller's owned revisioned flush before changing location; invalid saves keep the editor mounted. Admin controller preserves native protocol and stale-view guards. Dialogs keep their own selection/confirmation context; native account roles are not changed just by choosing a menu option. Shared SelectControl uses the closest dialog as its portal container when applicable.


## Admin Console P1 additions — 2026-10-18

packages/contracts/src/admin-policy.ts owns the pure product statement/grant matrix, shared role parsing and page-permission mapping. apps/api/src/lib/auth/access.ts adapts it to Better Auth native statements/roles. middleware/admin.ts owns per-route declarations, matched-route fail-closed checks and external native-admin HTTP blocking; middleware/http.ts installs the blocker before CORS preflight. routes/admin/users.ts exposes permission discovery and masked account/session reads through services/admin/user-service.ts and native server-only methods. Existing site/audit/resource endpoints declare their own required permission.

The web AdminShell resolves /me/permissions before mounting allowed child pages. AdminContext supplies grants, its controller uses domain account reads, overview sections honor resource permissions, and management dialogs omit unavailable sensitive account operations. Studio entry points use shared role membership. admin/layout.tsx uses the installed Next connection API to request-render administration. tests/admin-auth.test.ts covers actual mounted endpoint/role/native boundaries; web tests/admin-permissions.test.tsx covers permission-derived presentation and bilingual key parity. No P2 schema/MFA/password/last-owner implementation is introduced.

## P2b-2a sensitive action ownership — 2026-10-19

services/admin/sensitive-action.ts owns shared strict credentials/reasons, ordinary-target/session ownership checks, per-action operator password verification, audit preparation/outcomes and six-action denial budgets. services/admin/user-service.ts constructs native calls and sanitizes their domain responses; lib/auth/hooks.ts independently enforces/strips native extensions and appends outcomes. services/admin/site-service.ts retains site locking and state/outcome atomicity after a durable attempt. middleware/error-handler.ts records bounded domain pre-execution failures and avoids duplicating native-recorded events. Tests include sensitive-actions.integration.test.ts and the enforced MFA child. Existing site UI/controller own the password field/clearing and translated outcomes; account controls remain read-only in this pipeline-only scope.

## Reports and sensitive round2 additions — 2026-10-19

- API services/admin/password-failures.ts owns the dedicated operator failure budget; existing sensitive-action/hooks/user routes own audited email reveal and typed-ID native removal.
- API db/schema/reports.ts and generated migration0005/meta own the additive report table. routes/public/reports.ts and routes/admin/reports.ts own endpoint validation/permissions; services/reports.ts owns privacy, rates/dedup/cursor/transitions.
- contracts/src/reports.ts owns shared Zod inputs and report DTOs. portfolio/src/types.ts and portfolio.tsx provide a reportAction slot, forwarded by portfolio-detail.tsx.
- Web features/portfolio/report-form.tsx, report-copy.ts and report.module.css own the shared public form. features/management/admin/admin-reports.tsx, report-copy.ts (included through adminCopy) and reports.module.css own queue/detail, mounted by app/admin/reports routes. Existing controller supports dialog-only site moderation; AdminDialog owns explicit keyboard wrapping.
- Integration tests sensitive-round2/reports plus native MFA fixtures and web reports tests capture actual acceptance. Browser fixture updates remain local test infrastructure; scripts/test-api.ts enforces the same guarded database and supplies only synthetic salts.

## Round3 directories and operations — 2026-10-19
- Account/site metadata projections remain in services/admin/user-service and site-service; report relation filters remain in services/reports. Web admin-directory owns focused routes, keysets, related records and existing secured actions; directory-copy and operations.module.css own bilingual labels and form layout.
- db/schema/notices and generated0006/meta define the additive notice table. services/admin/notice-service owns minimized public windows and transactional audited mutations. routes/admin/notices and routes/public/notices expose their distinct permission/privacy boundaries. Contracts notices.ts shares strict inputs/types.
- services/admin/audit-export owns identifier-only CSV; audit-service owns filters and finite metadata projection. system-service owns real schema counters and permission-scoped overview. sensitive-action extends only its finite action registry for notice.manage/audit.export, retaining existing actor/password/TOTP/denial helpers.
- Web admin-activity, admin-system and admin-notices own operations views; operations-copy has exact bilingual keys. Shared AdminDialog has an optional drawer presentation. PublicNotices is product chrome only, mounted on homepage and across Studio screens; workspace-scroll preserves the desktop height budget with the banner.

## P6 — 2026-10-19
contracts/data-requests owns enums/transitions/input/types. db/schema/data-requests and generated0007/meta own requests plus verification evidence. services/admin/request-service owns attestation/state transitions/explicit bounded export; routes/admin/requests declares resource gates and strict input. routes/admin/staff owns safe read-only registry projection. sensitive-action reuses the existing pipeline for request.handle/export. Web admin-requests, admin-staff, requests-copy and own-sessions own the new UI; /security keeps its native protocol boundary. data-requests integration, enforced MFA and admin-requests web tests provide local evidence.

## Committed browser E2E suite — 2026-10-21

`e2e/playwright.config.ts` owns Chromium configuration, per-test failure artifacts and a serial/no-retry policy. `fixtures.ts` owns unique identities, real authentication/domain helpers, per-test cleanup and the exact-origin browser network gate. `seed.ts` is a one-line bridge to `apps/api/tests/fixtures/e2e-account.ts`. That API-owned fixture imports the existing database guard before application imports and creates disposable identities through native Better Auth, like the existing browser fixture; it adds no application endpoint. Drizzle imports resolve inside their declaring API workspace. `routing.spec.ts`, `journeys.spec.ts`, `language.spec.ts` and `guards.spec.ts` cover platform navigation, real owned publication, single-language UI and harness boundaries. `language.ts` centralizes the explicit script-check exceptions.

`scripts/test-e2e.ts` validates loopback folio_test, applies existing migrations, builds an environment-file-free web source copy under ignored work/e2e-runtime, starts the real API and production Next server and owns their teardown. `e2e/tsconfig.json` is checked by root typecheck. `.github/workflows/check.yml` adds an isolated PostgreSQL browser job with failure artifacts. See [E2E.md](E2E.md) for execution, scope and limitations.

## Owner monitoring — 2026-10-22

- `packages/monitoring/src/index.ts`: shared, SDK-independent outgoing event allowlist, secret/version validation and SDK 11 collection/sampling policy. `src/head.ts` uses the public Cloudflare SDK client/transport in an isolated scope for HEAD/OPTIONS, which automatic request wrapping skips.
- `apps/api/src/lib/monitoring.ts`: optional Worker fetch/scheduled boundaries; `src/worker.ts` retains database/image contexts and awaits scheduled failures as well as registering waitUntil.
- `apps/web/worker.ts` and `monitoring.ts`: official Next.js Cloudflare wrapper around generated OpenNext output with preserved Durable Object exports; no generated file is edited. `src/instrumentation.ts` captures Next server errors. `src/app/health/route.ts` is a no-write/provider-free liveness route.
- `apps/api/tests/monitoring.test.ts`: privacy/sampling/identity regression checks. Both apps' `tests/fixtures/worker-monitoring.ts` and `scripts/test-worker-monitoring.ts`: local SDK faults, whole-envelope privacy and actual generated OpenNext tests with intercepted ingestion/API. CI runs built-web mode after OpenNext build.
- `docs/MONITORING.md`: human-owned project settings, two no-database uptime monitors, interactive secret/deployment checklist and silencing. `docs/evidence/2026-10-21-owner-monitoring.md`: official comparison, local runtime/build/gate evidence and explicit unverified limits.

## Optional database latency evaluation — 2026-10-22

Worker HTTP/Cron pass the optional HYPERDRIVE binding into the existing request database scope. `db/hyperdrive.ts` requires a bounded origin role/database deadline; Bun and unbound configuration stay unchanged. `db/timing.ts` preserves pg promise/callback behavior while collecting numeric timings only when requested by DB_TIMING_LOGS. No active binding/timing variable is committed.

`tests/hyperdrive.integration.test.ts` verifies selection/deadlines, real native publication and an explicit same-connection serializable release/pointer rollback. The existing workerd fixture runs in bound and unbound modes, including Cron and real idle disconnects. `scripts/local-statement-timeout.ts` guards/restores the disposable local role/database setting for native binding tests; run database suites sequentially. `scripts/measure-worker-database.ts` and `scripts/measure-service-binding.ts` create/clean exact synthetic local accounts and save numeric-only latency evidence. Neither accepts hosted targets. See [latency evidence](evidence/2026-10-22-hyperdrive-latency.md).

`docs/HYPERDRIVE.md` owns the manual, secret-safe trial provisioning/deadline/binding/timing and rollback instructions; OPERATIONS/CLOUDFLARE/README link to it. Numeric benchmarks and official-source rationale stay in the dated evidence file.


## Platform palette ownership — 2026-10-22

`apps/web/src/styles/tokens.css` owns exact platform `--color-*` semantic values; global and feature/module styles consume them without changing import order. Legacy base and scoped admin variables remain aliases. Public portfolio modules and shared renderer palettes are deliberately separate and unchanged.

`docs/evidence/2026-10-22-platform-color-tokens.md` records the extraction, checks and limits. Its adjacent directory contains `inventory.json` (baseline CSS occurrences/counts), `palette.json` (exact literal-to-role map and first use), `visual.json` (all48 screenshot dimensions/decoded hashes/pixel counts) and `contrast.json` (identical before/after WCAG ratios). Generated captures and session-local measurement scripts stay under ignored `work/platform-color-tokens/`; no credentials or browser state are included in committed evidence.
