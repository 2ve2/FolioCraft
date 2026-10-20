# Dependency remediation record

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
