# Ichnara

> **Testing only:** The Cloudflare-hosted instance is a trial for friends to test and report issues. It is not a final launch or an accepted production release. Deployment to Cloudflare makes the test instance reachable; it does not establish production readiness.

A fixed-layout portfolio platform with a Next.js frontend independent of the Bun/Hono API, Better Auth accounts, and PostgreSQL data managed through Drizzle.

## Local development

1. `bun install --frozen-lockfile`
2. Copy `apps/api/.env.example` to `apps/api/.env` and configure PostgreSQL, the authentication secret, and frontend/backend origins.
3. Copy `apps/web/.env.example` to `apps/web/.env.local` and configure the API URL.
4. Run `bun run db:migrate` to apply the reviewed schema to the project database.
5. Run `bun run dev:api` and `bun run dev:web` in separate terminals.
6. Open `http://localhost:3000` for the product introduction. Sign in to use `/studio`; authorized platform administrators use `/admin` and its sites/accounts/activity pages. The API runs on `http://localhost:4000`.

Use `bun run typecheck`, `bun run check`, `bun run build`, `bun run test`, and `bun run test:web` for verification. Integration tests run exclusively against a local PostgreSQL database named `folio_test`; the wrapper rejects production URLs and isolates the test environment. Database setup details are in docs/OPERATIONS.md.

## Source organization

The [source structure guide](docs/SOURCE_STRUCTURE.md) describes backend/frontend responsibilities, stylesheet order, and development and verification steps. Entry points compose features; drafts, releases, and public reads have separate services, and frontend code is grouped by feature.

## Source of truth

Current documentation lives in `docs/`, starting with `docs/STATUS.md`, `docs/DECISIONS.md`, and `docs/ROADMAP.md`. Continuity instructions are in `AGENTS.md`. The original handoff package is retained outside the project as a historical record; this copy is the implementation reference.

## First vertical slice

Sign up/sign in -> create a portfolio URL -> profile and projects -> save a revisioned draft -> preview/appearance -> publish a public release at `/p/:slug`. Draft changes do not change public output until the next publication. Preview and publication use the same component. The editor supports Arabic/English and RTL.

The backend supports every content section, ordering and visibility, release history (newest 50 kept per site) and activation, the inbox, request limits, R2 image upload and verification, email verification, password reset and scheduled maintenance. The frontend provides profile, project, experience, education, skill, article and appearance editors, plus inbox, releases, administration and draft legal pages. New ids are cuid2; preview and publication use the same component, and Arabic portfolios render right-to-left from the server.

A Cloudflare-only trial on a temporary domain is deployed for friends to test; it is not a production launch. Last recorded hosted state: Resend accepted a password-reset submission, but mailbox delivery is unverified; the upload parser fix is deployed and API-level image checks passed, but browser upload, sign-in cookies and MFA are not yet acceptance-tested in a real browser; signup skips email verification by explicit human instruction (`TRIAL_SKIP_EMAIL_VERIFICATION`). The 2026-10-20 audit fixes (cuid2 migration, security headers, scheduled maintenance, legal pages) are not deployed yet. See [STATUS](docs/STATUS.md) and the [deployment guide](docs/CLOUDFLARE.md).

See the [API reference](docs/API.md) and [operations, integrations, and backups](docs/OPERATIONS.md). Use `bun run db:backup` for a private dump and `bun run db:verify-restore` to verify restoration using isolated local test data.
