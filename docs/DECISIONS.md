# Decision ledger

## 2026-10-20 — Workers XML response compatibility and bounded probe authorization
- Human explicitly authorized only generated small-image R2 PUT/copy/exact-key cleanup diagnostics after the failing user upload identified verify-copy/status200. This does not authorize deployment, user-object cleanup, CORS/account changes, database mutations or push.
- Evidence-led engineering decision: retain AWS SDK protocol handling and conditional immutable copy, but select the SDK's own non-DOM XML implementation through the API-only Wrangler package alias. The package's browser parser requires DOMParser, which local workerd lacks; real R2 copying already succeeded before the parser threw. Avoid a DOM polyfill, a custom XML parser, blind success after an SDK error, header/security relaxation or replacing conditional copy with unguarded upload.
- Pin @aws-sdk/xml-builder3.972.41 directly in the API because the build alias now depends on that entry. Installed source and bun info established compatibility/current version. Other runtimes retain default package selection. Credential-free local Workers regressions execute the actual alias and preserve permission/precondition/embedded/malformed/empty error rejection. The internal entry path is intentionally pinned and covered by this build/runtime gate; future package upgrades must rerun it.

## 2026-10-20 — Local upload/authentication UX corrections
- Human-confirmed scope: diagnose broken image upload, resize its feedback, remove redundant platform naming inside authentication forms, put recovery links in their relevant states, show only spinners during loading and prevent onboarding during logout. No deployment or GitHub push is implied.
- Engineering choice: keep URL-based interface locale and static routes; show the existing language-neutral loading artwork until locale restoration instead of briefly rendering English copy. Synchronize simultaneously mounted locale hooks through a local event; do not change portfolio content language or persist private data.
- Engineering choice: reserve action-label dimensions with visually transparent accessible content and overlay one decorative spinner. Keep disabled-state logic and accessible action names; narrow the small-screen publish-label selector so it cannot hide the shared wrapper or spinner.
- Engineering choice: an explicit sign-out transition blocks workspace/onboarding rendering, invalidates old site requests and navigates to the localized login page only after native sign-out succeeds. Failed sign-out retains the current workspace and exposes retryable feedback. Onboarding remains available for authenticated accounts without a site, not anonymous or signing-out users.
- Recovery placement: password recovery on login only; verification resend after successful verification-required signup or an actual EMAIL_NOT_VERIFIED response. Dedicated recovery routes and truthful provider-unavailable behavior remain.
- Read-only R2 configuration inspection confirmed canonical-origin PUT and Content-Type permission. This rules out an absent permission in the inspected policy, not every browser CORS/network/storage failure. Do not select an adapter/provider fix without a captured failing stage; live upload acceptance remains pending.

## 2026-10-18 — Admin Console P0 boundary and proposed security design
- Human-confirmed scope: P0 documentation only, entirely in English; no code or migrations, and stop for human review before P1. ADMIN_CONSOLE_TASK.md was read in full, including its corrective appendix. No GitHub push, deployment, account promotion or provider/database operation is authorized.
- Task-fixed future architecture: /admin and /api/admin, shared Better Auth access-control policy, owner/moderator/support/analyst roles, explicit deny-by-default permissions, staff TOTP, sensitive-action reason/password freshness, last-owner protection, limited impersonation and published-only default inspection. These requirements are not yet implemented.
- Proposed, not human-confirmed: replace legacy admin without an alias; single-use server-only invocation capability for native wrappers/hooks; per-action password check plus 300-second session.freshAge; enrollment-only self-service and a narrowly authenticated impersonation-stop wrapper outside /api/admin; 900-second impersonation limit; target-specific notes permissions; separate append-only attempt/outcome rows. See ADMIN_CONSOLE.md A1–A6 for approval gates, alternatives, audit-FK limitation, retention/deadline/export limits and operational unknowns.
- Evidence correction: current native audit hooks UPDATE outcome rows and current account UI reveals full email. No automatic bootstrap exists in source, but the claim that no administrator was ever promoted cannot be verified from files; hosted role inventory was not queried. No account identifiers or grant evidence are versioned.
- Verification boundary: the required root API test wrapper runs db:migrate before tests. The explicit no-migration instruction takes precedence in P0, so that suite is deliberately not executed; this is not a passing integration result. Other actual command results are recorded in STATUS/CHANGELOG.

Date: 2026-10-13 (Asia/Riyadh).

## Human-confirmed
- D01: One fixed comprehensive portfolio UI; configurable theme/colors and font type/style/size. Source: original user message recovered from referenced conversation.
- D02: Backend separate from frontend. Explicit correction overrides earlier Next.js backend/Supabase proposal.
- D03: Backend uses Bun, Hono, Better Auth, Drizzle ORM.
- D04: Use the read-only reference backend as inspiration for backend style. Identified local reference path in BACKEND_STYLE.md.
- D05: Create a new execution chat, transfer required information, create Markdown project memory.
- D06: Start implementation in existing `<project workspace>` and create its own new project session; supersedes proposed fresh projectless workspace. Preserve existing code/changes and follow its local instructions.

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
- Human requested domain-specific route files, useful response helpers, spacing and English explanations above every function, informed by the reference project source.
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

## 2026-10-16 — separate administration and personal workspace
- Human accepted the explained route separation and requested a substantial administration redesign. Confirmed responsibilities: /studio personal editing; /admin platform management; / product introduction. Existing user/admin roles remain; the question about manager rank did not authorize a new super-admin hierarchy or promotion.
- Engineering choices: independent overview/sites/accounts/activity child routes with a shared session-aware shell, real aggregate/resource data, bounded lists, server-side access filters and focused native management dialogs. No new backend/dependency/schema or invented analytics.
- Preserve draft-save ordering before leaving Studio: the administration entry is a guarded navigation action that awaits the existing revisioned flush and refuses departure on invalid/unpersisted data. Keep native account ID confirmation and required moderation reasons. A fixed admin return flag supports shared login without arbitrary redirect URLs.
- Reuse native dialog focus containment; portal shared select menus into their containing dialog to remain inside its accessible top layer. The layout's client gate improves UX; backend native/domain gates remain authoritative for every private operation. Local browser/build/test evidence is in STATUS. No deployment or GitHub push authorization added.

## 2026-10-16 — explicit GitHub upload authorization
- Human-confirmed: list required commits before uploading them. This authorizes synchronization to the existing origin https://github.com/2ve2/FolioCraft.git main while preserving history. It does not authorize Cloudflare deployment or hosted-storage mutations.

## 2026-10-17 — missing-page recovery and shared product footer
- Human-confirmed: redesign the unsuitable Not Found page and add the usual information-rich site footer. Engineering defaults: a violet404 illustration, generic missing-resource copy, URL-based Arabic/English interface language and real home/Studio recovery links. Do not identify all missing routes as unpublished portfolios.
- Reuse one ProductFooter on product landing, login/signup and404 pages: brand/description, product discovery anchors and account/workspace routes, with locale retained. Do not invent social/contact/legal destinations. Studio/admin remain work areas; user portfolio footers remain owned by the shared portfolio renderer. These exact placements/groups are engineering choices explained to the human, not separately confirmed configuration values.
- Scoped CSS preserves existing service-error styling and avoids changing backend/public lookup behavior. Local verification and limitations are in STATUS; no deployment or real-account mutation.

## 2026-10-17 — confirmed platform name: Ichnara
- Human-confirmed: replace the prototype working name FolioCraft with Ichnara. The immediate follow-up explicitly capitalizes the first letter; Ichnara is the final display spelling.
- Apply to product-controlled brand, titles, interface labels, authentication application/mail subjects and current README identity. Preserve historical prototype evidence, technical package/repository/runtime identifiers and existing hosts until a separate migration. Never rewrite user-authored portfolio content or existing database rows as part of a branding edit.
- No domain purchase/availability claim, trademark check, hosted rename or deployment is implied. Exact mark styling retains the existing violet identity.

## 2026-10-18 — geometric reference and distinctiveness requirement
- Human explicitly selected the original violet interlocking geometric reference as the direction and requested platform-specific symbol and lettering. This supersedes agent-led editorial exploration. Human additionally emphasized avoiding a movement already used by another brand.
- Preliminary visual review of Hostinger's owner-published h-icon found a related angular/violet impression, not identity or legal infringement. Source: https://github.com/hostinger/logo/blob/master/v3/h-icon.png . Retain the preferred geometric personality but develop a materially different symbol silhouette rather than merely rename/recolor it.
- Agent proposed an asymmetric I/n-inspired ligature and coordinated wordmark cuts. This new exact drawing is awaiting human review; no worldwide uniqueness, bespoke-font ownership or trademark-clearance claim. No application integration or deployment authorized by a concept review.

## 2026-10-18 — finished geometric wordmark delivery
- Human rejected the proposed standalone ligature and requested an actual finished usable product. Implementation choice under creative authorization: make Ichnara's drawn lettering the primary logo, deriving small icons from its capital I rather than proposing another abstract symbol. Exact visual acceptance is not separately human-confirmed.
- Construct seven geometric letter paths directly; do not use the previously generated image as a vector master or claim an existing font as custom. Deliver SVG/PNG/icon masters, usage guide and ZIP. Install in the shared local Brand component and Next favicon/touch-icon conventions. Portfolio content/fonts and hosted infrastructure remain unchanged.
- This is a complete asset/source delivery with representative checks, not a worldwide uniqueness/trademark or full custom-font certificate. No Cloudflare deployment or GitHub upload in this step.

## 2026-10-18 — reviewed corrections and Ichnara unification
- Human-confirmed: option A, Ichnara, selected in response to the explicit name comparison. Apply to root/workspace package names and imports as well as current product identity. Existing Worker names/URLs, database resource names and x-folio-client-ip protocol remain compatibility identifiers; no hosted rename authorized.
- Human requires local-only corrections, separate conventional commits, guarded folio_test integration tests and full local checks after change groups. Prior upload permission does not authorize a new push in this scope.
- Brand round2 is proposals only. No legal clearance, aesthetic approval, remote CI, hosted upload fix or recipient delivery can be inferred from local checks.

## 2026-10-18 — round2 identity accepted
- Human-confirmed after viewing round2: capital-I option I1, Arabic lockup A1, accent C1 (#3F46C8) and the proposed Arabic spelling encoded in the A1 artwork. Local integration is now authorized; no deployment/push or legal-clearance claim follows.
- Human-confirmed hygiene scope permits generalized documentation paths/hosts, one canonical AGENTS, complete STATUS archival and conditional duplicate ZIP removal after reference/equality checks. Existing Worker configuration remains unchanged; legacy download URLs must remain usable.

## 2026-10-18 — Arabic lockup optical correction
- Human reported excessive symbol/name separation on the local Arabic site while accepting the English version. Actual outlined word bounds end at812.75 and original symbol begins1130 (317.25-unit gap). Implementation reduces this to60 units by moving only the Arabic symbol and tightly cropping its viewBox; shapes, approved font/color and English files remain unchanged. Exact gap is an engineering choice under the correction request, not a separately human-selected number.

## 2026-10-18 — loading presentation redesign and upload authorization
- Human requested a more effective/reliable loading screen, rejected the first sparse redesign and explicitly required trustworthy specialized skills. Applied owner-published Anthropic frontend-design and Vercel web-interface guidance after reading them; this is a workflow source, not a claim of external designer endorsement.
- Engineering direction: decorative abstract portfolio sheets with the unchanged folded-band emblem, approved outlined locale wordmark and actual request status. No private-data placeholders, invented progress/stages or language selector. Motion is a brief transform/opacity sequence under5s with reduced-motion fallback; slow-request help after10s is not a failure diagnosis. Existing retry/navigation callbacks remain authoritative.
- Human explicitly authorized uploading the resulting local commits and updating Markdown. This supersedes the earlier no-push boundary for this upload only; no Cloudflare deployment, provider/production mutation or purchase authorization follows. Preserve origin/main history and list commits before pushing.

## 2026-10-18 — native date field locale and segment isolation
- Human-confirmed requirement: English date fields remain left-to-right; reported Arabic mobile placeholder reversal requires correction. Phone/browser identification is unavailable.
- Engineering choice: preserve native date input/calendar and ISO storage; pass locale explicitly from experience/education editors and isolate native date segments. No new calendar dependency or date/timezone conversion. Exact-device rendering remains unverified; the available browser's English native presentation cannot establish resolution of the supplied Arabic mobile symptom.

## 2026-10-18 — published portfolio platform attribution link
- Human requested and confirmed a small floating circle with the platform logo on every published personal site, navigating to the platform on activation.
- Engineering defaults: approved emblem in a48px C1 circle, bottom inline-end with16px safe-area spacing; native same-tab homepage link uses existing configured platform webOrigin and includes portfolio locale. Apply to public home/project/article chrome, without changing owner content or draft/release behavior. No separate human approval of exact size/placement is implied.

## 2026-10-18 — date/badge GitHub upload and idle handoff authorization
- Human explicitly authorizes uploading the completed local commits and necessary Markdown updates, then opening a new chat in this project that waits for the human's next command. This authorizes GitHub upload only; deployment/provider/production operations remain outside scope.

## 2026-10-18 — human-approved Admin Console amendment and P1 authorization
- Human-confirmed: ADMIN_CONSOLE.md appendix 11 supersedes conflicting P0 proposals. owner without alias; no actual role change. Reasons 10–500 including moderation. P2 requires password per sensitive action plus TOTP-authenticated session, without changing freshAge or requiring session age.
- Evaluate Hono rejection of all external native-admin HTTP calls and internal auth.api methods before considering a capability. Impersonation and administrative password-setting are disabled for every role; no banner/escape route. TOTP enrollment-only approved, trusted devices disabled. Explicit note permissions approved with target restrictions, implementation deferred after P3. Separate audit attempt/outcome inserts approved for P2; A6 deferred before launch.
- Last-owner P2 design must use pg_advisory_xact_lock and the native operation in one transaction compatible with transaction-mode pooling; no session lock/dedicated connection workaround. Prove adapter transaction participation or keep those operations unavailable and report the limitation.
- Human authorizes an amendment commit first, P1 implementation second and stopping afterward. Default HEAD build rerun is a separate diagnostic; report recurring hangs before any CI/build fix. No push, deployment, real-account promotion or P2 implementation authorized.

## 2026-10-18 — P1 shared RBAC and simpler native boundary implemented locally
- Implemented under the amended human authorization: shared pure policy, native Better Auth custom roles preserving default statements, explicit per-endpoint permission middleware with actual-route fail-closed checks, Hono rejection of external native-admin HTTP and internal native account read wrappers with masked DTOs. Tests prove project before-hook enforcement and the installed before/after internal lifecycle; no capability or new AsyncLocalStorage authorization context is needed.
- Legacy-only admin denies without an alias; no existing real account role conversion performed. All-role impersonation/password-setting denial is active. Sensitive native account mutations remain unavailable until P2; their old audit-update execution path was retired. Site moderation retains transactional audit inserts with 10–500 reasons. Separate native attempt/outcome insertion remains P2 work.
- P1 UI consumes /me/permissions, gates routes/sections, uses domain account reads and removes unavailable sensitive account controls. Studio shares staff membership. Request-rendered admin HTML has actual HTTP no-store/noindex proof. No new dependency/schema/migration, production account/provider mutation or build/CI setting change.
- Existing HEAD default build succeeded outside sandbox, so the prior sandbox hang did not establish a separate CI defect. P2 transaction design is documented with inspected adapter/savepoint feasibility and explicit unverified atomicity/rollback requirements. P2 remains unauthorized in this instruction; stop after P1 evidence.

## 2026-10-18 — P1 accepted; simplified P2 and P2a-only authorization
- Human-confirmed: P1 accepted. P2a is documentation plus additive two-factor SQL draft only, with the entire draft shown for review; no application/schema/config/test code or migration application on any database, including folio_test. No push, deployment or role change.
- Simplified P2 supersedes prior advisory/last-owner work: password-per-action through native verifyPassword and a TOTP-authenticated operator session; reason 10–500; ordinary-target ban/unban/session revocation/email reveal/removal with typed ID and site suspend/resume. Sensitive staff/protected targets and all set-role remain explicitly unavailable in the application. Impersonation/password-setting/private drafts and unlisted features remain closed; no advisory/last-owner implementation.
- Human-confirmed: native TOTP with trusted devices disabled, enrollment-only security pages, ADMIN_REQUIRE_MFA default true in production with false allowed only explicitly in development/test; no change to freshAge. Separate audit attempt/outcome inserts, bounded permission_denied using configurable P0 10/60 defaults, masking/audited POST reveal. Only native two-factor tables/standard fields may be added; no reports/requests/notices.
- Draft mapping choice, not yet human-approved SQL: one nullable user.two_factor_enabled boolean default false and one two_factor table with installed 1.7.7 fields, native-declared indexes, text auth IDs and cascading user FK. No session/audit schema addition. ADMIN_CONSOLE appendix 13 details installed-field evidence, future test impacts and unapplied draft path; OPERATIONS contains a reviewed manual role-change procedure that has not been executed.
- Proposed implementation details still awaiting design approval/proof: session-scoped TOTP provenance in existing verification records, server-side trust-cookie rejection/stripping, supported native pre-validation body extension for password/reason and after-hook correlation, and bounded denial buckets in existing rate_buckets. These do not create new tables or alter session.freshAge. No runtime correctness/security result is inferred from source review.

## 2026-10-19 — P2b-1 authorized; session proof and generated schema
- Human-confirmed scope: MFA only; generated Drizzle migration may add a session proof column and may be applied to local folio_test through bun run test. No production connection, roles, push, deployment or P2b-2 action/audit pipeline.
- Engineering selection under explicit choice authorization: nullable session.adminTotpFactor fingerprint instead of derived verification records; native input/return disabled, bound to verified current factor and authoritative session lifetime, no freshAge change. Appendix 14 records the comparison and exact generated-draft difference. SQL generated by drizzle-kit; no hand-authored migration.


## 2026-10-19 — P2b-1 native TOTP implementation and evidence
- Implemented engineering choice: hidden session factor fingerprint, native successful sign-in-only after hook and per-request authoritative session/factor check. Enrollment/recovery/old sessions remain unproven; no freshness change. Valid trusted-cookie stripping is demonstrated against an unguarded native control; OTP/trustDevice requests are denied. ADMIN_REQUIRE_MFA cannot be false in production.
- Native synthetic-key tests confirm that legacy unversioned factor/recovery ciphertext requires the original singular legacy key during version-list rotation; tagged ciphertext separately requires its matching retained version. Single-key replacement/missing tagged version returns native500. No automatic re-encryption or uninterrupted old-cookie guarantee is inferred. OPERATIONS records the reviewed procedure; no real secret is changed.
- Human authorized MFA implementation and local test migrations only. Sensitive-action password/reason/new audit work remains P2b-2, and broader P2 acceptance remains open. No role change, production connection, push or deployment authorization is inferred from local acceptance evidence.

## 2026-10-19 — P2b-2a accepted scope and pipeline selection
- Human-confirmed: P2b-1 accepted; implement only ordinary-target ban/unban, one/all session revocation and suspend/resume pipelines, operator password plus existing TOTP-session proof,10–500 trimmed reasons, separate durable attempt/outcome inserts and actor/action denial budget10/60. Reveal-email/remove-user/general denial limits remain P2b-2b. No new migration without prior review, push, deployment, production connections or real role/key changes.
- Engineering choice after the requested comparison: ADMIN_CONSOLE appendix15 selects expanded/stripped native body design A. A complete wrapper-only pipeline B would require duplicate hook work, a new trusted authorization context or native mutation replacement to cross the existing hook closure. A preserves the existing native-hook authority and uses narrowly tested installed dispatch semantics, with small shared helpers for domain-only moderation. This selection is not separately human-confirmed.
- All correlations are generated per invocation; denial keys are six finite server action names and authoritative actor IDs, fixed10/60 in existing PostgreSQL buckets. Existing private-write120/60 additionally bounds password verification. Error identity deduplication is bookkeeping only, never an authorization marker. No freshAge/freshness change, advisory/last-owner mechanism or new authorization context.
- Site dialog gains per-action password/translated failure feedback to preserve its named actions; account mutation controls remain outside this pipeline-only batch. Native completion plus missing outcome is explicitly indeterminate and must be reconciled before retry. Native state/audit atomicity against external role changes is not claimed; reviewed maintenance remains required for manual staff-role changes.

## 2026-10-19 — authorized round2 and P2b-2b decisions
- Human-confirmed: P2b-2a accepted; implement P2b-2b, then P3, separate commits and stop. P3 generated migration may be applied only through the root guarded local folio_test runner. No push/deployment/production/real role-key change or later phases.
- Engineering choice: one operator-level password failure bucket across sensitive actions, defaults5/900 seconds with900-second threshold block; configure bounded settings, count only native INVALID_PASSWORD, retain failure history through successes and preserve HTTP private-write120/60 unchanged. General anonymous denial logging is deferred for finite-budget/trusted-address/retention design; scoped authenticated logging is extended.
- Native account removal deletes relational records through existing cascades but does not delete R2 objects. Email reveal is a domain-only sensitive action, released only after durable success audit. Account mutation console remains read-only.

## 2026-10-19 — P3 reports implementation choices
- Human-confirmed scope: reports schema/public intake/shared template form/admin queue and handling, with local generated migration application only and then stop. No later phase or upload/deployment authorization.
- Engineering choices: optional local salt with explicit unavailable intake, mandatory production REPORT_IP_SALT; versioned HMAC over trusted derived addresses; public messages10–1000;8192-byte body;5 IP-wide/20 site-wide attempts per hour;300-second exact dedup with transaction-scoped digest lock. No raw IP persists. Synthetic browser salts are unique per fixture run to isolate QA quotas.
- Oldest-first cursor uses timestamp(3)/UUID to avoid losing PostgreSQL microseconds in JavaScript. Reports cascade with site removal; handlers use SET NULL, preserving report state on handler deletion. Closure notes10–500; closed states terminal; report handling uses report.handle plus existing TOTP, without an additional password requirement. Actual site suspension retains its own password pipeline.
- Reporter email is stored only as optional report contact and always masked in administrative projections, with no reveal permission in P3. Retention period is unconfirmed and no automatic purge/contact notification is invented. Shared dialog explicit keyboard wrap is justified by observed browser focus escape. Precise defaults are engineering decisions, not separately human-selected settings.

## 2026-10-19 — Round3 P4 directory choices
- Human-confirmed scope: implement P4 then P5, separate local commits and stop; no delegation, push, deployment, production or real role/key changes. Internal notes are explicitly deferred.
- Engineering choice: account directory uses an explicit domain projection under authoritative user.read middleware and ascending text-ID keysets because native listUsers supports offsets only. Account detail/session reads and mutation hooks retain native dispatch. Site UUID keysets similarly avoid timestamp precision loss without another migration; old site offset support remains for existing overview compatibility.
- Language/date are taken solely from the active published release; unpublished language is unavailable. Related report filters use site/owner metadata without loading draft content. UI exposes only exactly ordinary-account actions and existing password/reason pipelines.

## 2026-10-19 — P5 operational choices and upload authorization
- Engineering choices under authorized P5: reuse the existing sensitive-action password/TOTP/attempt pipeline for notice.manage and audit.export, with no new auth capability/header/context. Notice mutation and succeeded outcome share a transaction after the durable attempt. Generated notice windows have inclusive start/exclusive end, required end after start, messages1–1000, disabled-by-default DB flag and creator SET NULL.
- Identifier-only CSV exports default to at most1000 rows, configurable1–10000. Explicit columns omit emails/reasons/metadata; every cell is quoted and formula prefixes neutralized. Audit metadata uses finite keys/values rather than arbitrary historical JSON. Audit main/history pagination retains bounded offsets; account/site/report keysets remain real keysets.
- Failed upload events are unknown/unavailable because the actual schema records no failure event. Expired incomplete pending uploads and deleting rows older than15 minutes have separate real counts and explicit UI definitions. Build version defaults to unknown instead of inventing a release. Provider configuration flags do not imply health.
- Public notices poll every60 seconds; known end windows are removed locally at expiry. Already-open clients may take the poll interval plus network time to learn of new starts/disable changes. Portfolios never mount the product banner. Internal notes/requests/staff management remain deferred.
- Human later explicitly requested uploading the commits, superseding the initial no-push restriction only for the completed round3 commits and their documentation checkpoint. Deployment, production connections and real role/key changes remain unauthorized. Use ordinary fetch/ancestry verification/push, preserving remote history.

## 2026-10-19 — Masked-field search authorization
Human-required correction: account email predicates require authoritative user.read_email; every other staff role searches names only. Masking output alone does not prevent inference from matching, ordering or filters. Keep reporter email absent from administrative matching. This is a confirmed scope requirement, not a new privacy-policy proposal.

## 2026-10-19 — P6 engineering choices
Human authorizes P6/P7, generated-only local migrations, separate commits and a stop; no push. Engineering choices (not separately human-confirmed):30 elapsed-day due placeholder pending legal confirmation;1000 total rows/1MiB default export caps; mandatory one-time independent subject attestation with exact retyped ordinary account ID, evidence and persistent verified timestamp/actor. A contact email is not subject proof. Export includes safe account/site metadata and subject-owned inbox only; drafts/snapshots/assets/R2/backups and auth/security data excluded. Delete/correction remain manual, closure is operator evidence, export closure requires durable generation success. Additional verification columns make evidence survive SET NULL account removal. Staff inventory first1000 with truncation and read-only shared matrix; native own-session self-service only. No new auth context/freshness or external identity provider is introduced.

## 2026-10-19 — Round4 GitHub upload authorization
The human explicitly requested uploading the commits during P7. This supersedes this round's earlier no-push boundary only: finish P7 verification/cleanup and separate commits, preserve remote history, then ordinary GitHub synchronization. It does not authorize deployment, production connections, migrations, real role/key changes or later scope.

## 2026-10-19 — Round5 audited email boundary (human-confirmed)
Supersedes the earlier Masked-field search authorization decision: account directory search must match names only for every role, including owner/support. user.read_email authorizes the existing reason/password/TOTP/audit-protected reveal, never an unaudited email text predicate. Remove the search-only permission/session lookup; preserve the authoritative route gate and existing secured reveal/export operations. No alternative administrative email lookup/filter/sort is authorized. One fix commit and ordinary push to main are explicitly authorized, followed by a stop; no deployment/production access. Prior round4 protection was incomplete because it narrowed inference without preserving audited disclosure for owner/support.

## 2026-10-20 — Custom domain preparation only
- Human-confirmed target: exactly one canonical web origin https://lord2ve.tech and API https://api.lord2ve.tech; www is a later human-operated Cloudflare redirect, never another application origin. Local preparation, separate commit and ordinary push to main are authorized; deployment, provider/production access, secret/account changes are not.
- Engineering decision: retain current environment-driven HTTP/native-auth/client code and host-only Secure/HttpOnly/SameSite=Lax cookies. Installed-code review establishes these defaults; same-site credential behavior for HTTPS apex/API is an inference pending actual hosted browser proof, not a new security acceptance. No Domain sharing or SameSite=None change is justified for this topology.
- Keep worker names/bindings/workers_dev unchanged, update only non-secret origin vars and example comments. No custom-domain routes are provisioned by this task. All operational steps in CLOUDFLARE remain explicitly unperformed; historical trial evidence is preserved. See CUSTOM_DOMAIN_REVIEW for every legacy-hostname hit, exclusions and code/inference labels.
