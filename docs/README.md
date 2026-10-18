# Ichnara — Project handoff

Last updated: 2026-10-15, Asia/Riyadh.

The human confirmed "Ichnara" as the platform name on 2026-10-17. FolioCraft was the prototype working name. Historical references, the existing repository and trial hosts retain that earlier name. On 2026-10-18 the human selected Ichnara again; current root/workspace package names and imports now use ichnara/@ichnara. Worker names, URLs, database resources and existing protocol headers retain their compatibility identifiers.

## Goal
A portfolio builder with one fixed, comprehensive layout. Users customize themes, colors, font family/style, and text size while retaining a consistent UI structure. Support Arabic and English and content suitable for different disciplines.

## Human-confirmed decisions
- The backend is independent of the frontend.
- Backend: Bun + Hono + Better Auth + Drizzle ORM.
- Use `<read-only reference backend>` as a style reference without modifying that project.
- Open a new implementation session, transfer context, and create Markdown files to preserve decisions and progress.

## Initial proposed plan
- Frontend: Next.js + TypeScript + Tailwind + shadcn/ui for the dashboard, with a custom public portfolio design.
- PostgreSQL, S3-compatible storage, Zod, Biome, Bun Test for the backend, and browser tests of the full flow.
- Two independent applications in one repository; this proposed organization does not require shared execution or deployment.
- First implementation goal: account -> profile -> project -> appearance -> preview -> real publication.

## Reading order
Start a new session with `HANDOFF.md`, then `STATUS.md`; they describe the current continuation point and actual remaining work.
1. `AGENTS.md`: work continuity and documentation protocol.
2. `REQUIREMENTS.md`: product, scope, and acceptance criteria.
3. `ARCHITECTURE.md`: frontend, backend, data, API, and deployment.
4. `BACKEND_STYLE.md`: patterns observed in the reference project source and reuse boundaries.
5. `UI_UX_REVIEW.md`: actual prototype test findings.
6. `DECISIONS.md`: confirmed decisions, proposals, and open questions.
7. `ROADMAP.md`: implementation phases and completion criteria.
8. `STATUS.md`: current status, evidence, and next action.
9. `CHANGELOG.md`: work and handoff history.

## Context sources
- Prototype: https://ai.studio/apps/8adde5df-a98e-4263-8e84-910e47a5accd
- Prototype title: FolioCraft — Universal Portfolio Studio.
- Original conversation: `6ace08fc-25b0-83ed-9668-30315581eed3`, title translated as "Digital identity platform proposal".
- Retrieval of the original conversation returned the human requirement for a fixed layout; some assistant replies contained only placeholders, so their missing details must not be assumed.
- Review image: `../editorial-review.jpg` in the original handoff package.

Original handoff instruction: copy this package into the implementation project's `docs/` directory and keep those files current. Place `AGENTS.md` at the project root. Avoid competing sources of truth; the original package remains the initial handoff record.

## Current implementation

This copy at `docs/` is the source of truth. Content, appearance, inbox, release, and administration editors work locally. The human adopted independent desktop editor/preview scrolling and the violet styling. Backend source is organized by responsibility and frontend source by feature; see SOURCE_STRUCTURE for the map and STATUS for evidence and actual remaining work. A Cloudflare-only friends-testing trial is deployed; see [CLOUDFLARE.md](CLOUDFLARE.md) for actual targets, runtime adapters, the human-authorized temporary email-verification exception and verification limits. Mail delivery, live hosted uploads, a broader browser matrix and general-launch operations remain pending. The root README explains local execution.

Current typography and spacing are documented in DESIGN_SYSTEM.md; real-site evidence and limitations are in STATUS.md.

## Current source map

See [SOURCE_STRUCTURE.md](SOURCE_STRUCTURE.md) for responsibility placement after reorganization. Expanded previews and administration passed local reviews; external dependencies and the remaining device matrix are documented in STATUS.
