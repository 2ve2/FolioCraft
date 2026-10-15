# Decision ledger

Date: 2026-10-13 (Asia/Riyadh).

## Human-confirmed
- D01: One fixed comprehensive portfolio UI; configurable theme/colors and font type/style/size. Source: original user message recovered from referenced conversation.
- D02: Backend separate from frontend. Explicit correction overrides earlier Next.js backend/Supabase proposal.
- D03: Backend uses Bun, Hono, Better Auth, Drizzle ORM.
- D04: Use sooqha-backend as inspiration for backend style. Identified local reference path in BACKEND_STYLE.md.
- D05: Create a new execution chat, transfer required information, create Markdown project memory.
- D06: Start implementation in existing `/home/lord2ve/Desktop/blog-website` and create its own new project session; supersedes proposed fresh projectless workspace. Preserve existing code/changes and follow its local instructions.

## Proposed implementation defaults
- P01: Next.js, TypeScript, Tailwind, shadcn/ui dashboard; custom public template renderer.
- P02: PostgreSQL, transaction-capable driver; S3-compatible storage.
- P03: One account/site initially; Arabic/English; three finished theme presets.
- P04: One repository, independently deployed apps/web and apps/api; contracts/portfolio shared packages.
- P05: Zod, React Hook Form, Tiptap, next-intl, Biome, Bun Test and browser tests.
- P06: Immutable release snapshots; explicit publish; draft optimistic concurrency.
- P07: Local email/password auth first; verification/reset via tested mail transport; social auth deferred until configuration exists.
- P08: R2 is storage candidate to align with source style; Vercel web host candidate; API and DB host open.

User asks us to proceed with judgment; don't repeatedly seek confirmation of routine reversible choices. Record final choices and evidence as implementation progresses. Proposed defaults above are not quotations or explicit user selections.

## Superseded
- Backend business logic inside Next.js: replaced by independent Hono API.
- Supabase Auth and Supabase-dependent backend: replaced by Better Auth/Drizzle/PostgreSQL. Supabase hosting is not required.
- Treating each preset as a different persona/content set: violates confirmed fixed-template requirement.

## Open choices (not initial blockers)
- Final product name and domain; FolioCraft is temporary prototype name.
- Production API/DB/storage/mail providers and credentials.
- Exact versions verified against compatibility at implementation.
- Login providers and whether bilingual site content is needed in addition to bilingual UI.
- Custom domain and payment provider/pricing for later release.
- Original prototype source export unavailable; observed preview/review is sufficient to start a clean implementation. Don't claim imported source code.

## Decision entry template
ID/date; status (human-confirmed/default/implemented/superseded); choice; rationale; evidence; affected files; migration/reversal implications.

## I01 — local implementation defaults (2026-10-13)
- Implemented choice: apps/web and apps/api, shared contracts and portfolio packages; docs/ is authoritative.
- Initial domain draft is a versioned, Zod-validated JSONB aggregate on an owned site; immutable JSONB releases reference the site. This reduces cross-table save complexity in the first slice. Auth stays relational. Separate domain tables can be added with reviewed migrations when query needs justify them.
- PostgreSQL via node-postgres/Drizzle with transactions and row locking. Isolated project-local PostgreSQL cluster; no reference or system production database used.
- No Git initialization/commits because .git is read-only and existing parent repository includes unrelated home files.

## I02 — Neon PostgreSQL (2026-10-13)
- Human-confirmed provider: Neon, supplied connection. Use pg with Drizzle real transactions, not Neon HTTP driver.
- Existing public tables inventory: none. Migrations add project tables; tests create uniquely identified users and clean up only their exact IDs.
- Local PostgreSQL server was not started: user selected Neon instead. No system database changed.
- Email/password available locally; no mail provider configured, so verification/reset email remain explicitly deferred and no email delivery success claimed.
- Package versions selected from registry and installed lockfile: Next 16.4.0, React 19.3.0, Better Auth 1.7.7, Hono 4.13.13, Drizzle 0.45.4. Official references checked: Better Auth installation/Drizzle/Hono/database; Drizzle PostgreSQL; pg transactions; Next installation; Hono Bun. See source links in ARCHITECTURE.md.

## I03 — slice completion and UI implementation (2026-10-13)
- Implemented desktop/mobile studio and fixed renderer using straightforward React controls, Tailwind import and scoped CSS, rather than adding an external dashboard framework. shadcn was proposed, not a human-required dependency; richer control primitives can be introduced when needed.
- Independent UI locale and portfolio locale: changing editor language translates editor chrome without changing content or published language. Portfolio locale is an intentional draft setting.
- Template responsiveness uses named CSS container queries so a desktop mobile-preview pane follows the same width rules as the public phone page.
- Local publication is a database release accessible via `/p/:slug`; it is not a production hosting deployment. Production remains unauthorized/unconfigured.
- Manual browser QA sample retained for visual review under browser-qa-20261013; synthetic test data only. Automated integration test rows were cleaned.

## D07 / I04 — production backend first (2026-10-13)
- Human clarified production intent and instructed comprehensive backend-first implementation; parallel delegation remains authorized.
- Complete owned content operations reuse validated revisioned JSONB aggregate, preserving transactional publication and old schemaVersion1 payloads. New fields optional; section-specific strict CRUD and final aggregate validation prevent duplicate IDs/slugs and invalid dates.
- Immutable releases store publish-selected data; public projection removes draft-only articles and hidden sections. History/activation uses ownership and compare-and-swap expected published pointer; draft is not replaced by rollback.
- User chose Cloudflare R2 and can provision bucket; SMTP/domain not available yet. Real adapters implemented with explicit unavailable responses. Production authentication requires configured verification/reset mail and HTTPS; no provider success inferred from code.
- Local isolated PostgreSQL folio_test replaces testing against the existing Neon environment. Runner explicitly sets test-only database/env and tests reject production/nonlocal settings.
- Assets use bounded image decoding and conditional staging-to-verified copy, signed private downloads and active-release-only public issuance. Existing signed downloads remain valid for their short expiry after unpublish.

## D08 — Better Auth Admin (2026-10-13)
- Human-confirmed: use official Better Auth Admin plugin rather than implementing independent user-role/ban/session endpoints.
- Platform admin resource routes use verified session/admin role; no signup-supplied admin role and no shared admin password headers.
- Initial administrator grant requires an explicitly authorized existing account; no account silently promoted.

## D09 / implemented — backend organization and continuity (2026-10-13)
- Human requested domain-specific route files, useful response helpers, spacing and English explanations above every function, informed by Sooqha source.
- Human authorized parallel delegation and requested Markdown continuity followed by a new local session. Reuse this workspace; do not overwrite existing work or start duplicate development servers.
- Reference CUID2/text IDs and JavaScript Date defaults are confirmed observations. Existing UUID data is retained; adopting or converting conventions requires a deliberate compatibility migration, not an unannounced reset.
- Better Auth Admin, platform moderation, audited native admin operations and isolated admin-specific acceptance are implemented (13 tests/741 assertions overall). No real existing user was granted administrator rights.

## I05 — moderation, audit and compatibility policy (2026-10-13)
- Implemented default: suspend/resume requires a reason and records the event in the same site transaction. Suspension removes public access and prevents publish/activation, retaining owner draft access and historical/public pointers for reversible moderation. Account bans remove public access while active; expiry restores access to retained releases. Native Better Auth bans revoke sessions.
- Native Better Auth Admin hooks record a sanitized durable attempt before an allowlisted mutation, then finalize succeeded/failed after the official endpoint. Its protocol and transaction remain owned by Better Auth; audit finalization is not atomic with that native mutation. An interrupted finalization retains attempted status and needs operator investigation. Mutation hooks exclude password/email/token/ban-reason payloads; platform moderation audits retain required reasons.
- Compatibility choice: retain existing UUID domain IDs, auth text IDs, timestamp types and stored values. Reference CUID2/JavaScript defaults alone do not justify a migration. Any future conversion must include preserved reference/snapshot/instant proof and rollback/compatibility plan. No conversion proposed for this scope.
- Existing timestamp-without-time-zone ban expiry stores Drizzle Date values as UTC. Public/inquiry SQL explicitly compares against PostgreSQL time in UTC; this fixes timed-ban behavior when the DB session uses Asia/Riyadh without rewriting stored values. Native auth/private checks retain Better Auth Date instants.
- Above moderation/compatibility details are implementation defaults, not new human quotations. Official Admin choice and no silent real-account promotion remain human-confirmed.

## D10 — testing and new frontend continuation (2026-10-13)
- Human-confirmed: proceed with needed project tests because the product is not deployed; review/update Markdown and open a new local project chat to continue. This does not authorize deleting preexisting data, promoting a real admin, publishing production or buying services.
- Human accepted frontend-first continuation: extended content editors/shared renderer and real R2 image integration, then inbox/release history/admin interfaces and bilingual/mobile acceptance. Preserve fixed template, shared preview/public components and immutable published separation.
- R2 supplied credentials remain exclusively in ignored0600 server env; account/bucket aliases mapped to existing schema names. Exact localhost3000 CORS and live adapter/browser proof recorded in STATUS; final production origin/mail remain open.


## D11 / I06 — frontend quality and shared controls (2026-10-14)
- Human requested explicit section/checkbox spacing, formal loading without a language selector, one reusable design for all selects, and autonomous discovery of remaining frontend defects.
- Implemented default: native React content fields and constrained blocks reuse revisioned aggregate/API. Shared SelectControl keeps native named form values and uses an accessible keyboard/portal popup; no extra UI package was required.
- Preview uses public components at fixed1100px desktop or390px phone layout widths, then scales the rendering into the pane. Container-relative typography keeps layouts consistent. Shared contact form disables submission in owner/history preview.
- Empty structured blocks now retain plain-body display/read-time until real structured text exists. Both data fields remain stored; the editor explains precedence. Regression proof covers fallback/read-time; no schema/migration/data rewrite.
- Same-account unsaved recovery stays in component memory, scoped by owner; it keeps the original revision and surfaces conflict rather than merging over newer server content. Explicit confirmed logout/load-latest discards intentionally. No private drafts persisted to browser storage.
- Initial real admin promotion remains separately authorized; bounded native UI actions use official Better Auth. Mocked component checks are not provider/production evidence.

## I07 — published image embedding (2026-10-14)
- Implemented default: allow Cross-Origin-Resource-Policy:cross-origin solely on successful GET/HEAD302 from the matched published asset route. All other routes retain same-origin. Independent API/web origins require public image embedding; blanket Hono secureHeaders prevented it in actual browser. Ownership/current-release/moderation validation and short signed URLs remain enforced. No migration or global header relaxation. Regression test and actual browser320px decoded images passed.

## I08 — measured UI typography and published discovery (2026-10-14)
- Human asks calculated typography/spacing and consistent readable text. Implemented defaults documented in DESIGN_SYSTEM.md: self-hosted Noto Sans Arabic Variable/Noto Naskh Arabic Variable/IBM Plex Mono5.3.0, tokens for type/spacing/radius44px controls, actual font names and14/16/18px base sizes visible in menus. Existing stored appearance keys unchanged; no migration. Exact families are engineering defaults, not separately human-confirmed names.
- Published-only metadata/canonical/optional existing-cover OpenGraph/Twitter and sitemap index/per-site sitemap use current accessible releases. Public discovery exposes slug/publishedAt only, cursor pages100, same ban/suspension predicate. Private editor/admin noindex. Index refuses more than50,000 entries until sharding; API/DB failures503 rather than fake empty success. Configure NEXT_PUBLIC_WEB_URL to real origin before deployment. No crawler/social-provider receipt or production indexing claimed.
- Observed live DNS/socket errors prompted bounded pg client query_timeout16s alongside server statement_timeout15s and connection_timeout5s; classify observed ETIMEOUT/DNS/read-deadline errors as recoverable503. A query read deadline does not cancel already sent server work; server deadline/transaction guards remain authoritative. Isolated actual pg_sleep regression and safe response tests passed. No data reset or migration.

## D12 / implemented defaults — 2026-10-14
Human requested slightly smaller type, Settings last, and actual CS demo content in lord; authorized invented illustrative data and signed in himself. Demo contact links use example.com and labeled demo social URLs. No account privilege change or agent publication. Preview navigation now uses shared public markup and local private detail rendering; instance-scoped IDs/scrolling keep editor URL and public data unchanged. Human paused before final browser/build acceptance.

## I09 — preview parity and inspection width (2026-10-14)
Implemented engineering defaults under the human-authorized frontend correction scope: expanded desktop uses the available width above700px, bounded1100px; narrow desktop simulation preserves1100px and horizontal panning. Ordinary preview stays scaled1100/390. The portfolio itself owns RTL/LTR, so its scroll stage uses LTR overflow coordinates. Preview-only safety messaging belongs to surrounding chrome and accessible form description, preserving public layout dimensions while disabling inquiry submission. Same-snapshot geometry proof covers Arabic1100/390 and shared detail navigation; no migration or publication. These are implementation choices, not separately human-confirmed breakpoint numbers.

## P09 — independent scrolling review trial (2026-10-14)
Human explicitly requested a demonstration before adoption, liked its appearance and requested branded scrollbar refinement. Implemented a local development-only opt-in toggle; default layout retained pending final choice. Scrollbars keep native browser interaction with CSS appearance/fallbacks; desktop panes contain their own scroll and action header stays visible. No saved content/preference change. Local20s DB connection timeout is a session recovery override following a7857ms read-only connection probe, not a new production policy.

## D13 — independent desktop scrolling adopted (2026-10-14)
Human-confirmed: approved the demonstrated split-scroll layout and violet scrollbar styling ("Yes, done" (translated)). Removed trial UI/state; accepted desktop>=971px pane layout is always enabled, mobile keeps edit/preview tabs. CSS-only native scrollbar interaction remains. Web checks/build and actual1042/390px browser proof passed. No persisted account/data migration.

## I10 — cohesive source ownership (2026-10-14)
Implemented under the human's explicit request to organize backend/frontend for clarity and growth. API routes call draft/release/public services directly; siteService is a small compatibility entry point. Native auth hooks are separate from adapter/configuration. Web app routes import grouped features; Studio orchestrates views and a single controller retains save/recovery/publication concurrency. Editors, administration, asset URL renewal, copy/types and shared UI have dedicated modules. Portfolio package exports and CSS cascade retained; CSS source formatting changes indentation only. No migrations/dependencies/providers or production settings changed. Exact folder names are engineering choices, not separately human-selected names.

## I11 — administrative count correction and fixture shutdown (2026-10-14)
Separate bug fixes discovered during the refactor proof: Drizzle's single-table selection removed column qualifiers inside correlated count subqueries, making resource site_id compare with its own id and falsely report0. Bind the validated selected site UUID as a query parameter in all three counts; retain admin authorization/redaction. A real failing1-versus0 test now covers positive/scoped/zero counts. Browser fixture cleanup was interrupted by terminal signals; parent runner now awaits the child while forwarding signals, and fixture signal handlers stay active through cleanup. Actual final Ctrl+C exits0, removes2 generated users, leaves0 and removes temporary credentials. No Neon data deletion or role grant.
## D14 — English documentation and granular commits (2026-10-14)
Human-confirmed: all project Markdown must be entirely in English, including examples and historical quotations/titles. Product Arabic/English localization remains unchanged. Every completed project-file work step/addition/change requires a separate clearly described commit; preserve remote history. The human explicitly excluded their account permission grant from commits; no account identifier or grant evidence is added to versioned documentation.


## D15 — Cloudflare-only friends trial (confirmed 2026-10-14; recorded 2026-10-15)
- Human-confirmed: free Cloudflare hosting, available with the computer off; no paid Containers, tunnels or external backend hosts. Additive Workers API/OpenNext web implementation retains independent Bun local execution, PostgreSQL transactions and shared renderer.
- Human-confirmed: temporarily allow signup without email verification because no mail provider is available for friends testing. TRIAL_SKIP_EMAIL_VERIFICATION defaultsfalse; current trial config explicitly sets true. Real mail and disabling the exception are required before general launch.
- Human explicitly approved transferring existing project database/storage credentials and a new session secret to their Cloudflare Workers Secrets. No actual values or account-grant identifiers belong in Git or documentation.
- Engineering defaults, not separately human-selected implementation details: request-scoped PostgreSQL/Images bindings, Node SHA256, pinned OpenNext manifest patch and global_fetch_strictly_public routing. Actual proof and remaining limits are in CLOUDFLARE/STATUS.

## D16 / I12 — restore exported draft JSON (2026-10-15)
- Human-confirmed feature: Settings uploads previously downloaded JSON to fill fields quickly. Engineering defaults: maximum2MiB file, existing schemaVersion1 validation, explicit in-page replace/cancel confirmation, existing revisioned owned-save endpoint, success-only editor replacement and same-session operation guards.
- Restores content/locale/appearance while preserving site address and public release. Missing optional legacy collections, rich blocks, visibility and image references normalize to empty/default values so newer fields do not survive the intentional replacement. Image bytes are not in the export; existing backend asset eligibility still applies. No automatic publication, asset transfer, new API or schema migration.

## D17 — optional identity and project decoration (2026-10-15)
- Human-confirmed: users must be able to hide the entire profile image/initials circle and decorative project artwork when they have no cover. Independent appearance toggles implement these choices; they do not delete uploaded images or release references.
- Engineering compatibility defaults: additive optional booleans profileVisualVisible/projectFallbackVisible; absence preserves existing visible behavior. Explicit false persists through save/publication/export/import. Legacy intentional restore supplies true to avoid retaining newer hidden states through merge compatibility. No database migration or automatic existing-content rewrite. Future deployment sequence: compatible API, then matching web. Rollback retains stored JSON; no destructive contraction.

## D18 — product entry and small-action styling (2026-10-15)
- Human-confirmed scope: English app default, bilingual responsive product introduction, corrected auth arrows, centered logout icon, spaced project badge/actions, consistent text arrows and polished existing tooltips. Portfolio content/locale and published release boundaries remain independent.
- Engineering defaults: fictional interactive shared-template example;16px/1.75-stroke diagonal arrows mirrored for Arabic with8px gaps; violet portal tooltips with keyboard/focus/Escape and viewport bounds. Exact dimensions/colors are implementation choices, not separately human-selected.
- Human explicitly selected local-only work; no Cloudflare deployment or hosted-storage mutation. Later autonomy preserves that restriction. Refresh redesign and TanStack Query are proposals only; no state-library migration.

## 2026-10-16 — responsibility-based source organization
- Human-confirmed: populate actual domain folders, including administrator routes, remove obsolete empty scaffolding, and make functions understandable with descriptions and separation. Preserve product behavior; local-only deployment boundary remains.
- Engineering choice: API admin/sites/public route indexes; site/admin services; auth/storage helper groups. Web profile/projects sections, separate administration controller and shared management helpers; seven shared portfolio sections. Exact directory names are implementation choices, not separately human-confirmed.
- Keep coupled draft/session/recovery/publication transitions in one controller; split presentation and pure formatting instead. Renderer108-case and admin-action AST8-case comparisons plus existing tests guard preservation. No schema/dependency change.

## 2026-10-16 — independent authentication and explicit template preview
- Human-confirmed: /login and /signup are independent pages; their forms must not replace the landing example inside the introduction. Share the visual identity and retain both languages.
- Engineering choice: a dedicated auth feature owns form requests/state; existing Studio keeps coupled workspace operations. A shared URL-based interface locale follows entry/auth/workspace navigation while English remains the default and portfolio content locale remains independent.
- Human reported that Explore the template appeared ineffective. Engineering choice: reuse the existing expanded shared preview instead of an anchor to an already visible sibling. This changes only the landing action; the example is still explicitly fictional and inquiries remain disabled.
- Local acceptance recorded in STATUS. No new deployment or GitHub destination approval was provided.
