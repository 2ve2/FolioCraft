# Dependency remediation record

## 2026-10-22 — Studio prerequisite
- Next16.4.1 and OpenNext1.20.13 are pinned existing dependencies. Main's original lockfile reproduced the high/critical Next16.4.0 audit findings. Registry metadata confirms Node>=20.9, React19 and the paired adapter's Next>=16.4.1 support. No new direct dependency was added.
- The two existing cache reliability hunks are preserved under patches/@opennextjs%2Fcloudflare@1.20.13.patch; upstream now includes the preview-props manifest handling. All remaining dependencies retain their pins.
- Source-only frozen installation and complete Next/OpenNext/local Worker verification are recorded in [studio evidence](evidence/2026-10-22-studio-startup.md). Initial linked-copy bundling failures did not independently prove the older adapter incompatible; the maintained pair is the tested choice. No hosted deployment is inferred.

## 2026-10-18 — Previous remediation

Date: 2026-10-18. Runtime Bun1.4.2, root/workspace source and lockfile reviewed locally. No deployment or remote CI run.

## Initial result

`bun audit` reported2 vulnerabilities:1 high and1 moderate. Advisory output listed several installed versions, but the affected paths were @node-minify/core's pinned glob10.3.3 and @esbuild-kit/core-utils's esbuild0.18.20. Newer esbuild versions in Wrangler/OpenNext were displayed in the aggregate package heading; they are not all vulnerable to the <=0.24.2 advisory.

`bun audit fix` completed with0 fixes because those parents constrain glob to10.3.3 and esbuild to~0.18.20. It did not justify broad dependency upgrades.

## Applied resolution

Root overrides target only these parents: @node-minify/core → glob10.5.0; @esbuild-kit/core-utils → esbuild0.25.12. Other glob/esbuild consumers keep their existing compatible versions. Bun writes lockfileVersion3 for scoped overrides; both local and CI already use1.4.2. Frozen install in the independent checkout succeeds.

- Glob advisory and patched10.5.0: https://github.com/advisories/GHSA-5j98-mcp5-4vw2 . CLI command option is affected; this is not a blanket claim that build tooling is safe.
- Esbuild advisory and vulnerable development-server behavior: https://github.com/advisories/GHSA-67mh-4wv8-2f99 .
- Scoped override behavior: https://bun.sh/docs/pm/overrides .

## Actual verification

- Final `bun audit`: **No vulnerabilities found (checked495 packages)**, exit0. This is the registry report at this time, not certification that all code is secure.
- `bun run typecheck`, `bun run check` (258 files), `bun run build` (18 static outputs), `bun run test` (guarded local API21 tests/878 assertions) and web tests10/111 all pass.
- Independent frozen install plus `bun run --cwd apps/web build:cloudflare` succeed. Existing @opennextjs/cloudflare1.20.11 patch remains unchanged and its installed load-manifest.js includes preview-props. Worker bundle generated successfully; no deploy command run.
- Private command output: work/review-fixes/audit-before.txt, audit-fix.txt, audit-after.txt and task5/. No vulnerability exception needed for these two findings. Hosted runtime, remote CI and production migrations were not exercised.

## 2026-10-20 — @paralleldrive/cuid2 3.3.0 (added)

- Purpose: human-confirmed id generator for every new record, content item, asset and correlation id (`packages/contracts/src/ids.ts`).
- Version check: npm registry `latest` was 3.3.0 (published 2026-01-25), MIT, ESM-only, dependencies `@noble/hashes`, `bignumber.js`, `error-causes`. Pinned exactly in `packages/contracts`.
- Runtime review: the installed source draws randomness from `globalThis.crypto.getRandomValues` and initializes lazily on the first `createId()` call, so the Cloudflare Worker never generates random values at global scope. Workers bundle dry-run, `test:worker-storage` and `test:worker-mail` pass with it bundled.
- `bun audit` after installation: no vulnerabilities found.

## 2026-10-21 — Browser E2E tooling

`bun info @playwright/test --json`, `bun info @playwright/test engines --json` and `bun info @playwright/test dist-tags --json` confirm maintained Microsoft Playwright stable/latest1.64.1, Node>=20. Pinned exactly in root devDependencies with its matching playwright/playwright-core1.64.1 and frozen Bun lockfile. CI uses Node22, Bun1.4.2 and matching Chromium revision1248. This is development tooling only; no application runtime dependency was added. Actual checks are recorded in the dated E2E evidence.

## 2026-10-21/22 — Server-only Sentry 11.8.0

`bun info @sentry/cloudflare --json`, `bun info @sentry/cloudflare engines --json`, `bun info @sentry/cloudflare dist-tags --json`, `bun info @sentry/nextjs --json` and `bun info @sentry/nextjs peerDependencies --json` confirmed stable/latest11.8.0, supported Node22.12+ (local22.22.2), Wrangler4 and Next14/15/16. Both packages are pinned exactly with Bun lockfile; no version was copied blindly from a reference. The small shared monitoring package declares the same pinned Cloudflare SDK for its public per-event client.

Official [Next.js-on-Cloudflare instructions](https://docs.sentry.io/platforms/javascript/guides/cloudflare/frameworks/nextjs/) document the `@sentry/nextjs/cloudflare` wrapper since11.6.0 and the server onRequestError hook. Existing compatibility date2026-10-14 and nodejs_compat satisfy the documented minimum2025-08-16. Installed SDK11 uses dataCollection in place of legacy sendDefaultPii; all sensitive categories are explicitly disabled and beforeSend reconstructs a strict allowlist. Runtime proof and final actual audit/bundle results are recorded in the dated owner-monitoring evidence. No browser initialization, withSentryConfig, replay, profiling, source-map upload or vendor patch is introduced.

## 2026-10-23 — TanStack Query 5.104.2 (web, administration console)

`npm view @tanstack/react-query time`, `peerDependencies`, `dependencies` and `license` showed 5.104.5 as the newest stable release (2026-10-19), MIT licence, peer React 18 or 19 (the web app uses 19.3.0) and one dependency, `@tanstack/query-core` at the same version. 5.104.2 (2026-10-11) is pinned exactly with the Bun lockfile, choosing a release that has been public for over a week over the newest patch. Used only by the administration console (`features/management/admin/admin-query.tsx`); no devtools, persistence plugin or server-side prefetching.
