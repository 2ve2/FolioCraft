# Source structure guide

Last updated: 2026-10-15. This guide describes the actual implementation, not a proposed library list.

## Project boundaries

`apps/api` is the independent backend and `apps/web` the independent frontend. The frontend imports neither the database nor backend configuration or secrets. Both applications share data contracts in `packages/contracts`; public output and private preview share `packages/portfolio`.

Cloudflare target configuration is in each app `wrangler.toml`; web adapter settings are in `apps/web/open-next.config.ts` and its Bun patch is under root `patches/`. Generated `.open-next`/`.wrangler` output and private evidence in `work/` are ignored, not product source. See [CLOUDFLARE.md](CLOUDFLARE.md).

## Backend: where should a change go?

```text
apps/api/src/
  server.ts                    Bun execution, shutdown and connection limits
  worker.ts                    Cloudflare entry, trusted edge address and request scopes
  app.ts                       Middleware and route composition only
  config/env.ts                Configuration loading and validation
  middleware/                  Authentication, administration, protection and HTTP errors
  routes/                      Request validation and delegation to the responsible service
  services/
    siteDraftService.ts        Drafts, ownership, revisions and site settings
    releaseService.ts          Publish, unpublish, history and prior release activation
    publicSiteService.ts       Accessible published release reads only
    siteService.ts             Small compatibility facade for existing consumers
    contentService.ts          Content collection updates and ordering
    assetService.ts            Owned asset lifecycle, attachment and verification
    inquiryService.ts          Messages and inquiry inbox
    adminService.ts            Administrative resources, suspension and resumption
    auditService.ts            Administrative action recording
    publicAccess.ts            Shared public availability predicate
    rateLimitService.ts        Atomic PostgreSQL request limits
  lib/
    auth.ts                    Better Auth configuration and database adapter
    auth-hooks.ts              Mail rules, administrative permissions and protocol audit
    mail.ts                    Real mail transport when configured
    storage-client.ts          Storage client configuration
    storage.ts                 Storage operations and image verification delegation
    image-validation.ts        Bun Sharp full-image validation
    image-validation.worker.ts Workers Images validation and forced decode
    worker-images-context.ts   Request-local Images binding
    response-helpers.ts        Safe success and error response contract
    validation.ts              Resource identifiers and pagination
  db/
    index.ts                   Bun pool, Workers request-scoped DB and deadlines
    schema/                    Actual tables grouped by domain
    migrations/                Explicit migrations and Drizzle metadata
apps/api/tests/
  *.test.ts                    Database, protocol and authorization tests
  test-guard.ts                Reject production and remote databases
  fixtures/browser-server.ts  Temporary browser accounts/server on folio_test only
```

Content routes in `routes/content.ts` compose profile/projects/appearance/experiences/education/skills/articles/sections. `collection-router.ts` and `content-validation.ts` are domain helpers; remaining route files have descriptive names: `account`, `sites`, `releases`, `assets`, `inquiries`, `admin`, `public-*`, `runtime`.

Start request changes in a route and implement database rules and transactions in its service. Routes must not write directly to the database. Draft operations use site locking, ownership, draft revisions, and asset verification. Publication retains its atomic transaction and immutable snapshot. Better Auth owns its protocol; do not wrap its responses in the domain API envelope.

The `siteService.ts` facade remains for compatibility with tests and existing consumers. Internal runtime source imports the specific responsible service. Do not add new logic to the facade.

## Frontend: thin routes and independent features

```text
apps/web/src/
  app/                         Next routes, layout, metadata and robots/sitemap
  components/ui/               Brand, Field, LanguageSwitch and SelectControl
  features/
    studio/
      studio.tsx               Screen state and workspace section composition
      use-studio-controller.ts Draft loading/recovery/saving and site operations
      welcome-screen.tsx       Sign-in and sign-up screens
      onboarding-screen.tsx    First site creation
      loading-screen.tsx       Loading and recoverable errors
      workspace-sidebar.tsx    Workspace and account navigation
      workspace-header.tsx     Language, save state and publication controls
      workspace-preview.tsx    Preview frame, device and expansion controls
      site-address.tsx         Site address editing
      sections/                content/appearance/settings
      copy.ts, types.ts        Feature copy and internal contracts
    content/
      content-editors.tsx      Section editor composition only
      experiences-editor.tsx   Experience
      education-editor.tsx     Education and certificates
      skills-editor.tsx        Skill groups
      articles-editor.tsx      Articles
      visibility-editor.tsx    Section visibility
      project-extras.tsx       Additional project fields, cover and gallery
      rich-editor.tsx          Constrained text blocks
      collection-actions.tsx   Ordering and confirmed deletion
      input.tsx, reorder.ts    Content input and array ordering without ID changes
      copy.ts, types.ts        Shared copy and props
    assets/
      asset-picker.tsx         Upload, library and image states
      use-asset-urls.ts         Private asset URL renewal scoped to account/session
      copy.ts, types.ts        Copy and internal contracts
      asset-picker.module.css  Local library styles
    management/
      site-operations.tsx      Inbox and publication history
      admin-panel.tsx          Standalone or embedded administration UI
      shared.tsx               Pagination, requests, errors and dates
      copy.ts, types.ts        Administrative/operations resource copy and contracts
      management.module.css    Shared resource management styles
    portfolio/
      portfolio-preview.tsx    Preview dimensions, private navigation and modal
      inquiry-form.tsx         Inquiry form; preview submission is disabled
  lib/
    api-origin.ts              Backend origin allowed for browser requests
    auth-client.ts             Official Better Auth client
    api.ts                     Domain API requests and ApiError contract
    public-metadata.ts         Metadata from the published release only
  styles/                      Tokens and global styles with explicit ordering
```

`use-studio-controller.ts` remains the single coordinator for saving, revisions, recovery, and session changes. Splitting this state into independent stores could race draft saving against publication or account switching, so its algorithm was preserved during reorganization. Editing sections receive `draft` and an `update` callback and render controlled fields. Do not bypass operation locks or site revisions with another API write.

Reusable controls belong in `components/ui`. Feature-specific components stay in `features/<name>` alongside their copy, types, and local CSS Module. Features must not import implementation files from `app`: dependencies point from route to feature, not the reverse.

## Styles and shared portfolio

`app/globals.css` is only a CSS entry point. Import order deliberately preserves the existing cascade: tokens, foundation, welcome, workspace, responsive, editor-groups, loading, select-control, readability, workspace-preview, workspace-scroll, scrollbars. Do not alphabetize these imports; readability and some responsive rules are ordered refinements over the base rules.

```text
packages/portfolio/src/
  index.tsx           Stable package exports
  portfolio.tsx       Same public layout for preview and published releases
  portfolio-detail.tsx Project and article details
  appearance.ts       Themes, fonts, text sizes and CSS variable generation
  copy.ts             Arabic and English portfolio copy
  format.ts           Allowed links, keys and reading time
  section-elements.tsx Headings and date ranges
  rich-content.tsx    Safe React blocks and image gallery
  styles.ts           Readable portfolio rules; excludes Studio styles
  types.ts            Internal rendering props
```

The `@folio/portfolio` exports remain unchanged: `Portfolio`, `PortfolioDetail`, `RichContent`, `portfolioFontNames`, `portfolioTextSizes`. `packages/contracts/src/index.ts` is the shared data contract: Zod, versions, content limits, public projection, and reading-time calculation. It was unchanged during this round.

## Adding a section or extending a feature

1. Define the data contract in contracts and test input limits and the public projection.
2. Add a route and service using existing ownership/revision guards, with a transaction for multi-step operations.
3. Add the editor in the appropriate feature using the shared update callback and translated field names.
4. Add rendering to the shared portfolio with its copy and RTL support; do not create a second preview layout.
5. Verify saving, publication, account isolation, and desktop/phone output.

## Verification and execution

Run API and web in separate terminals as described in README and OPERATIONS. Use `bun run check`, `bun run typecheck`, `bun run test`, and `bun run build`. Database tests use the root wrapper and folio_test only; never run them with Neon settings.

For an isolated local build while the user-facing web app runs: `FOLIO_QA_BUILD=1 bun run --cwd apps/web build --webpack`. For isolated administration testing, `bun run test --admin-browser` starts the fixture on4400; web4300 uses API origin127.0.0.1:4400. Temporary credentials stay inside work with0600 permissions and are cleaned on shutdown; never copy them into documentation.

Comparison material and temporary copies in `work/structure-refactor` are evidence for this round, not product modules or importable libraries. Exact verification evidence and limitations are in STATUS and CHANGELOG; a successful build does not prove production deployment or coverage of every browser and screen reader.
