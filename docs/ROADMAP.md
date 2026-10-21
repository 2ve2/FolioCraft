# Implementation roadmap

Execution state updated 2026-10-15: extended editors, owned assets and public details implemented and representative browser gates passed. Checkboxes reflect actual proof; exhaustive acceptance and launch integrations remain.

## Phase 0 — setup and evidence
- [x] Copy docs into new project, root AGENTS.md; inspect cwd/git/tooling.
- [x] Verify Bun and current compatible package versions/docs.
- [x] Scaffold independent web/API workspaces, contracts and fixed renderer package as needed.
- [x] Explicit environment examples, real Neon setup and CI check scripts.
- [ ] Local/configured mail transport.
Gate: independent API/web run; TypeScript/recommended Biome/build pass. API health/readiness routes implemented; endpoint smoke evidence recorded separately.

## Phase 1 — first vertical slice
- [x] Reviewed auth/site/release migration; profile/projects/appearance validated in JSONB aggregate (I01).
- [x] Better Auth sessions and real signup/signin/signout.
- [ ] Email verification/reset transport proof (provider not configured).
- [x] Site ownership checks and two-user isolation tests.
- [x] Onboarding, profile editor, one-project editor with persisted data.
- [x] Fixed template with one complete light preset; private shared preview.
- [x] Draft autosave/revision behavior and publish transaction/public endpoint.
- [x] Reachable local public portfolio route; reload persistence; draft/public isolation proof.
Gate PASSED: account → bio → project → appearance → preview → publish in real browser with Neon persistence; invalid save and draft/public separation verified. Production deployment remains separate.

## Phase 2 — complete content and appearance
- [x] Owned asset metadata/lifecycle and verification code with local image/ownership proof.
- [x] Live R2 upload/copy/download/delete and local browser CORS proof; exact trial-origin policy configured, hosted upload lifecycle still pending.
- [x] Backend projects/gallery/rich blocks and experience/skills/education/article CRUD APIs.
- [x] Frontend editors/rendering for these additions (representative persistence/browser proof; full quality gate still being audited).
- [x] Three tested theme presets and Arabic/Latin font pairs preserving content.
- [x] Backend section visibility, featured/order data and public project/article API lookups.
- [x] Frontend controls and public page routes for additions (published project/article browser acceptance, real cover/gallery decoding + final build proof).
- [x] Representative Arabic/English/RTL and mobile quality gate:320/390/1440 actual browser, long/unbroken/mixed text, missing optional fields/hidden sections, keyboard selectors and enlarged preview. Broader device/variant matrix remains ongoing QA.
Gate: representative Arabic/English portfolios work at desktop/mobile widths, including long/missing content and keyboard navigation.

## Phase 3 — publication and launch preparation
- [x] Backend release history/activation/unpublish, CAS/idempotency/concurrent publish and immutable DB checks.
- [ ] Public domain routing/name reservation; configured provider when available.
- [x] Published SEO/canonical/share existing cover and sitemap index/per-site discovery; draft articles excluded, moderation guards tested. Real crawler/social-host acceptance and optional generated fallback share artwork remain launch work.
- [x] Backend persisted inquiries/private inbox and distributed PG rate limits.
- [x] Inbox frontend with persisted intake/read/archive browser proof.
- [ ] Optional real mail notification delivery (SMTP unconfigured).
- [x] Structured errors/retry semantics, CI workflow, private backup and real local restore proof.
- [x] Remote CI execution: GitHub Actions "Checks" runs on every push (49 runs through 2026-10-20; latest main green). The workers job added on 2026-10-20 still awaits its first remote run.
- [ ] Scheduled retention/backups: daily maintenance Cron Trigger and 50-release retention implemented and locally proven (2026-10-20) but not yet deployed; scheduled database backups and retention periods remain undecided.
- [ ] Public cache policy (currently no-store).
- [x] Deploy authorized Cloudflare trial API/web; hosted signup/sign-in, owner draft save/reload, publication and separate public page observed. Full provider/device/launch acceptance remains pending; see CLOUDFLARE.md.
Gate: recorded end-to-end acceptance and real deployment evidence; no invented provider checks.

## Later
Custom domains; actual aggregate analytics; subscriptions; imports; AI assistance; multiple sites/collaboration. Advance when core flow is stable and scope is explicit.

## Current human-requested backend completion gate
- [x] Separate content, publication and public route domains; consistent domain response helpers.
- [x] Better Auth Admin server/client plugin and schema foundation; no automatic admin promotion.
- [x] Platform admin routes, audited moderation actions and public suspension/ban enforcement.
- [x] Admin authorization, escalation prevention, ban/session and moderation integration tests.
- [x] English comments above every function, spacing and remaining middleware/storage organization.
- [x] Inspect the reference project R2, app/middleware, IDs and timestamps read-only; record actual conventions.
- [x] Resolve ID/timestamp compatibility policy explicitly before any migration of existing identifiers or instants.
- [x] Live Neon readiness/session recheck: readiness200 and existing authenticated owner browser; no live administrator grant/mutation claimed.

## Source organization accepted scope — 2026-10-14
- [x] Separate backend draft/release/public services and native auth configuration/hooks; HTTP interfaces and database ownership/transaction guards preserved.
- [x] Group frontend features/UI and split studio views/controller, content collections, management/admin and assets/hooks; keep shared public/preview renderer.
- [x] Preserve CSS cascade and package exports; source guide and per-app README updated.
- [x] Verify backend suite, both typechecks, Biome, web build/API bundle, before/after renderer comparison and actual browser paths. See latest STATUS for precise results and limits.

## Source responsibility/readability acceptance — 2026-10-16
- [x] Populate admin/sites/public route groups and align service/auth/storage ownership and build aliases.
- [x] Separate profile/projects editors, admin view/controller, management utilities, image preview and shared portfolio sections.
- [x] Add function descriptions/separation, remove obsolete empty web scaffolding and rewrite the actual source map.
- [x] Preserve108 renderer outputs, eight admin action bodies, CSS rule order; pass existing API/web tests, typechecks and independent builds with local browser checks.

## Authentication page separation — 2026-10-16
- [x] Independent /login and /signup routes, real landing/home/mode links and separate auth ownership.
- [x] Preserve translated credentials/errors and route locale; verify real guarded local signup/login and workspace entry.
- [x] Give Explore the template an explicit expanded shared preview; verify both locales,390px layout, project navigation, Close/Escape/focus restoration.
- [x] Typechecks, Biome, web tests and final Next/OpenNext build pass; local fixture cleanup confirmed.

## Independent administration acceptance — 2026-10-16
- [x] Separate product landing, personal /studio and /admin child routes; retain administrator-only access and shared login return.
- [x] Replace raw embedded administration with responsive navigation, real resource overview, bounded account/site/audit views, server filters and focused management dialogs.
- [x] Verify native confirmations, self-account protections, site moderation, session revocation/audit, RTL/mobile menu focus and save-before-administration behavior on isolated accounts.
- [x] Existing API/web tests, typechecks, Biome and final independent build pass; clean temporary accounts and leave normal localhost development ready for human review.

## Authorized round2 local acceptance — 2026-10-19
- [x] P2b-2b: independent configurable password failures, audited email reveal and owner-only typed native ordinary-account removal; relational/R2 deletion boundary documented. General anonymous denial logging explicitly deferred.
- [x] P3: generated reports migration applied only through guarded local folio_test; public strict/size/rate/dedup/privacy proof; oldest cursor/filters/role/MFA/status/audit proof; bilingual shared public and administrative UI with real local browser/keyboard/moderation acceptance.

These checkboxes record the scoped local acceptance in ADMIN_CONSOLE16–17, not production rollout or a broader launch gate. Stop for human review; P4–P7 remain unauthorized in this round.

## Authorized round3 local acceptance — 2026-10-19
- [x] P4: masked account directory with real keysets/search/filters, account/session/site/report details and existing secured actions; publication-only site metadata, filters and moderation history. Internal notes explicitly deferred.
- [x] P5: filtered/grouped activity and audited identifier-only CSV; permission-scoped system/overview with truthful state counters; generated-only bilingual notices schema and secured administration/minimized public banners. API/MFA/web/type/lint/build and real local browser checks recorded in STATUS.

These checkboxes concern local acceptance only. Production notices migration/provider configuration and later P6/P7 remain outside this authorization. The human separately requested GitHub upload of the completed round3 commits; no deployment follows.

## Authorized round4 local scope — 2026-10-19
- [x] Mandatory masked-email search oracle fix with authoritative read_email and role regression (94fefd9).
- [x] P6 scoped local requests/one-time independently attested subject/bounded owner JSON/read-only staff/native own-session UI, generated-only local0007 and full API/MFA/web/type/style/build checks (a02eca6).
- [x] P7 final four-role/all-page browser matrix, operations/incident/open-retention/original-plan gap mapping, final regression and verified cleanup. Stop after the later human-authorized upload.

These are scoped acceptance checks, not a claim that every original console feature is implemented. ADMIN_CONSOLE22 explicitly lists remaining original-plan gaps. The human later authorized uploading the completed commits; no production migration or deployment follows.

## Committed browser regression gate — 2026-10-21
- [x]43 committed Chromium checks cover the requested Arabic/English critical journeys against real Bun/Hono/PostgreSQL and production Next, with native security, unique fixtures and explicit script exceptions/negative controls.
- [x]Final clean installation passes all eleven quality gates and the complete E2E suite three consecutive times; source/configuration byte parity and local cleanup verified.
- [x]Dedicated PostgreSQL18 PR job passes43/43 in approximately2m08s including setup/cleanup; reports/traces/screenshots are configured as failure-only artifacts. Actual run39624159815 and limitations are recorded in evidence/2026-10-21-playwright-e2e.md.

These checkboxes concern the requested local/CI Chromium regression gate only; they do not establish hosted mail/R2/cookie/device acceptance or authorize deployment. PR4 remains unmerged.
