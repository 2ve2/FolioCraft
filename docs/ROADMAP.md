# Implementation roadmap

Execution state updated 2026-10-14: extended editors, owned assets and public details implemented and representative browser gates passed. Checkboxes reflect actual proof; exhaustive acceptance and launch integrations remain.

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
- [x] Live R2 upload/copy/download/delete and local browser CORS proof (production origin pending).
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
- [ ] Remote CI execution, scheduled retention/backups and cache policy (currently no-store).
- [ ] Deploy staging to chosen hosts when authorized/configured; smoke test actual origin/session/domain behavior.
Gate: recorded end-to-end acceptance and real deployment evidence; no invented provider checks.

## Later
Custom domains; actual aggregate analytics; subscriptions; imports; AI assistance; multiple sites/collaboration. Advance when core flow is stable and scope is explicit.

## Current human-requested backend completion gate
- [x] Separate content, publication and public route domains; consistent domain response helpers.
- [x] Better Auth Admin server/client plugin and schema foundation; no automatic admin promotion.
- [x] Platform admin routes, audited moderation actions and public suspension/ban enforcement.
- [x] Admin authorization, escalation prevention, ban/session and moderation integration tests.
- [x] English comments above every function, spacing and remaining middleware/storage organization.
- [x] Inspect Sooqha R2, app/middleware, IDs and timestamps read-only; record actual conventions.
- [x] Resolve ID/timestamp compatibility policy explicitly before any migration of existing identifiers or instants.
- [x] Live Neon readiness/session recheck: readiness200 and existing authenticated owner browser; no live administrator grant/mutation claimed.

## Source organization accepted scope — 2026-10-14
- [x] Separate backend draft/release/public services and native auth configuration/hooks; HTTP interfaces and database ownership/transaction guards preserved.
- [x] Group frontend features/UI and split studio views/controller, content collections, management/admin and assets/hooks; keep shared public/preview renderer.
- [x] Preserve CSS cascade and package exports; source guide and per-app README updated.
- [x] Verify backend suite, both typechecks, Biome, web build/API bundle, before/after renderer comparison and actual browser paths. See latest STATUS for precise results and limits.
