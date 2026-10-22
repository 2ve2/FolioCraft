# Ichnara documentation

Last updated: 2026-10-22, Asia/Riyadh. This directory is the source of truth for the project. Start every session with [STATUS.md](STATUS.md), then [DECISIONS.md](DECISIONS.md), as [AGENTS.md](../AGENTS.md) requires.

Ichnara (the human confirmed the name on 2026-10-17; FolioCraft was the prototype working name and survives in the repository, Worker and resource names) is a bilingual Arabic/English portfolio builder with one fixed, comprehensive layout. Owners change themes, colors, fonts and text size; the structure stays consistent. The backend is independent: Bun, Hono, Better Auth and Drizzle ORM. The web app is Next.js on Cloudflare Workers.

## Start here

- [STATUS.md](STATUS.md): current state, active work, blockers and next actions.
- [DECISIONS.md](DECISIONS.md): dated decisions, rationale and confirmation status.
- [CHANGELOG.md](CHANGELOG.md): action log, newest first.
- [REQUIREMENTS.md](REQUIREMENTS.md) and [ROADMAP.md](ROADMAP.md): product scope, acceptance criteria and phases.

## Engineering

- [ARCHITECTURE.md](ARCHITECTURE.md): applications, data, API and deployment shape.
- [SOURCE_STRUCTURE.md](SOURCE_STRUCTURE.md): where each responsibility lives in the source tree.
- [BACKEND_STYLE.md](BACKEND_STYLE.md): backend conventions taken from the read-only reference project.
- [API.md](API.md): HTTP endpoints and response envelopes.
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md): fonts, type scale, spacing and color tokens.
- [DEPENDENCIES.md](DEPENDENCIES.md): dependency pins and security remediation.
- [E2E.md](E2E.md): the committed Playwright suite.

## Operations

- [CLOUDFLARE.md](CLOUDFLARE.md): trial Workers, bindings, domains and deployment commands.
- [OPERATIONS.md](OPERATIONS.md): maintenance, administration procedures, data requests and incident notes.
- [MONITORING.md](MONITORING.md): optional Sentry capture and UptimeRobot checks.
- [PUBLIC_CACHE.md](PUBLIC_CACHE.md): optional published-page cache runbook (off by default).
- [HYPERDRIVE.md](HYPERDRIVE.md): optional Hyperdrive runbook.
- [LAUNCH.md](LAUNCH.md): work required before opening public registration.
- [ADMIN_CONSOLE.md](ADMIN_CONSOLE.md): administration design, permissions and acceptance record.

## Evidence and history

- [evidence/](evidence/): dated evidence for each completed step.
- [brand/](brand/): brand verification and the review inputs the brand-kit generator reads. Published brand assets live in `apps/web/public/brand/ichnara`.
- [archive/](archive/): superseded reports kept for history (earlier status pages, handoff notes, route/media/domain/mail diagnoses, the prototype review and earlier brand studies). They do not override the documents above.
