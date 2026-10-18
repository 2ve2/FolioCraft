# Source structure guide

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
      index.ts                   Small siteService compatibility facade
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
    schema/                      Tables grouped by domain
    migrations/                  Explicit reviewable migrations
```

Routes validate requests and delegate to services; database rules do not belong in route handlers. `admin/index.ts` applies the administrator gate before mounting its children. Private operations retain ownership/session checks. Publication retains its transaction and immutable snapshot. Better Auth owns its protocol responses.

Internal callers import the responsible site service. Keep `services/sites/index.ts` as a compatibility facade, without adding implementation there. The `#image-validation` Bun import and Wrangler alias intentionally select different decoders; update both when moving their targets.

Guarded database tests live in `apps/api/tests`; `tests/fixtures/browser-server.ts` creates disposable local browser accounts through the root test wrapper. Never use that fixture against hosted databases.

## Frontend: feature ownership

```text
apps/web/src/
  app/                           Thin routes, metadata and layout
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
        admin-panel.tsx          Route view composition and refresh feedback
        admin-overview.tsx       Real totals, resources and recent activity
        admin-lists.tsx          Site/account/audit records and bounded pagination
        admin-management-dialogs.tsx Site moderation and native account confirmation
        admin-dialog.tsx         Native modal lifecycle and focus restoration
        use-admin-controller.ts  Requests, filtering, paging and guarded mutations
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
  lib/                           API/auth clients, public metadata and interface-locale hook
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

`app/globals.css` is an ordered import entry point: Tailwind, tokens, foundation, welcome, landing, workspace, responsive, editor-groups, loading, select-control, readability, workspace-preview, workspace-scroll, scrollbars. `landing.css` follows `welcome.css` to preserve the extracted rules' cascade. Do not alphabetize imports.

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

`app/login/page.tsx` and `app/signup/page.tsx` mount the shared auth feature with a fixed mode. WelcomeScreen contains only product introduction, example and links. Auth requests do not belong in the workspace save controller. `lib/use-interface-locale.ts` reads/updates the `lang` URL parameter and document direction; its readiness guard prevents authenticated redirects from losing the requested language. This is interface state, never portfolio draft content.

Explore the template opens ExpandedPortfolioPreview through WelcomeScreen state; LandingShowcase supplies the same fictional draft/theme used by its inline preview. Reuse the modal focus/Escape/scroll handling instead of implementing a second overlay.

## Independent administration routes

`app/admin/layout.tsx` mounts AdminShell; its overview/sites/accounts/activity page modules mount the matching view only after the client session gate. Domain/native backend gates remain the security boundary. /studio owns the personal editor; / always mounts LandingPage. Auth normally returns to /studio; only the fixed from=admin intent selects /admin.

Administration no longer appears as a Studio section type. The Studio navigation action awaits the controller's owned revisioned flush before changing location; invalid saves keep the editor mounted. Admin controller preserves native protocol and stale-view guards. Dialogs keep their own selection/confirmation context; native account roles are not changed just by choosing a menu option. Shared SelectControl uses the closest dialog as its portal container when applicable.


## Admin Console P1 additions — 2026-10-18

packages/contracts/src/admin-policy.ts owns the pure product statement/grant matrix, shared role parsing and page-permission mapping. apps/api/src/lib/auth/access.ts adapts it to Better Auth native statements/roles. middleware/admin.ts owns per-route declarations, matched-route fail-closed checks and external native-admin HTTP blocking; middleware/http.ts installs the blocker before CORS preflight. routes/admin/users.ts exposes permission discovery and masked account/session reads through services/admin/user-service.ts and native server-only methods. Existing site/audit/resource endpoints declare their own required permission.

The web AdminShell resolves /me/permissions before mounting allowed child pages. AdminContext supplies grants, its controller uses domain account reads, overview sections honor resource permissions, and management dialogs omit unavailable sensitive account operations. Studio entry points use shared role membership. admin/layout.tsx uses the installed Next connection API to request-render administration. tests/admin-auth.test.ts covers actual mounted endpoint/role/native boundaries; web tests/admin-permissions.test.tsx covers permission-derived presentation and bilingual key parity. No P2 schema/MFA/password/last-owner implementation is introduced.

## P2b-2a sensitive action ownership — 2026-10-19

services/admin/sensitive-action.ts owns shared strict credentials/reasons, ordinary-target/session ownership checks, per-action operator password verification, audit preparation/outcomes and six-action denial budgets. services/admin/user-service.ts constructs native calls and sanitizes their domain responses; lib/auth/hooks.ts independently enforces/strips native extensions and appends outcomes. services/admin/site-service.ts retains site locking and state/outcome atomicity after a durable attempt. middleware/error-handler.ts records bounded domain pre-execution failures and avoids duplicating native-recorded events. Tests include sensitive-actions.integration.test.ts and the enforced MFA child. Existing site UI/controller own the password field/clearing and translated outcomes; account controls remain read-only in this pipeline-only scope.
