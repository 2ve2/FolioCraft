# Deterministic browser E2E acceptance — 2026-10-21

## Problem and design

Critical bilingual journeys previously had no committed browser regression gate. The human requested real locally built applications, isolated PostgreSQL, native authentication, publication privacy, ownership denials and CI artifacts; completion additionally requires three consecutive local passes and a green PR E2E job.

Work is confined to the independent GitHub checkout, branched from freshly fetched main ba37ac6 as codex/playwright-e2e. The initial checkout had local pool-investigation commits on another branch; they remain there and are not silently transplanted into main. The pre-existing untracked docs/ADMIN_CONSOLE_TASK.md was preserved.

The runner validates local folio_test before imports/migrations, supplies only explicit test configuration, creates a source-only Next staging directory with no environment files, builds production Next, starts the real Bun API and next start, waits on actual readiness and owns process cleanup. Real schema migrations are applied only to this disposable local database. The guarded fixture uses native Better Auth as the existing browser fixture does; no server bypass endpoint or fake UI/database state is introduced. Provider settings are absent. Browser egress is restricted to exactly127.0.0.1:4300/4400. Test-native verification semantics are preserved with the trial flag false. Existing rate budgets are allowed to expire by a bounded condition wait; they are never deleted or disabled.

## Files

- Root package.json/bun.lock: exact maintained @playwright/test1.64.1, test:e2e and E2E typecheck in the root typecheck gate.
- scripts/test-e2e.ts: guarded local orchestration, isolated build and owned-service teardown.
- apps/api/tests/fixtures/e2e-account.ts and its one-line e2e/seed.ts bridge keep Drizzle inside the API workspace.
- e2e/playwright.config.ts, tsconfig.json, fixtures.ts, seed.ts: Chromium, unique disposable identities, scoped verified deletion, real protocol helpers, network gate, no retries and failure artifacts.
- e2e/routing.spec.ts, journeys.spec.ts, language.spec.ts, guards.spec.ts, language.ts:43 checks and explicit notation/user-content exceptions.
- .github/workflows/check.yml: isolated PostgreSQL18 job, Node22/Bun1.4.2, matching Chromium, ten-minute timeout and seven-day failure HTML/screenshot/trace artifacts.
- docs/E2E.md, README.md, SOURCE_STRUCTURE.md, DEPENDENCIES.md, DECISIONS.md, CHANGELOG.md and STATUS.md: execution, design choices, actual acceptance and limits.

## Local runtime/browser evidence

PostgreSQL18.6 was initialized under ignored work/e2e-postgres and bound to loopback only. No hosted database, provider resource or real mailbox was used. Playwright1.64.1 uses Chromium revision1248. Three consecutive invocations of bun run test:e2e completed with these actual reporter lines:

```text
43 passed (27.6s)
43 passed (26.6s)
43 passed (27.0s)
```

The production web build completed49/49 pages on every invocation. Native signup/sign-out/sign-in/onboarding and persisted profile edits ran in both interface languages. A barrier held the real draft write while asserting the locale route had not changed; after release the other-language editor read the saved name. Public HTML and API retained the published name after a later private draft was persisted. Unpublication returned404 from both surfaces. Cross-owner read/preview/draft/address/publish/unpublish attempts returned403/404 and owner state remained equal. Four admin page gates and three protected API routes denied ordinary users in both languages.

Navigation sentinels/mutation observers proved the document survived landing/login/signup/privacy/terms/home without any loading-screen mount. Path/query/hash preservation, Back, server Arabic HTML and actual404 status assertions passed. Script checks covered20 public platform pages plus onboarding/studio sections/admin denial; two negative-control tests proved visible text, placeholder, aria-label and title violations are caught while aria-hidden artwork is excluded. The explicit allowlist covers proper names, formats, notation and known generated user content only. Three runner guards rejected a remote database, a wrong database and a connection-override query before any service started. /ready reported mail/storage disabled.

Raw logs and final HTML report remain ignored under work/e2e-evidence and work/e2e-report. Failed development attempts exposed ambiguous editor/preview locators, expected hero punctuation, documented proper-name/unit exceptions and a report directory resolved relative to the config. These harness issues were corrected without modifying product behaviour or weakening assertions. The save listener was also moved before field interaction to avoid missing early autosave on slow runners.

## Required quality gates — actual command output

All commands ran from the independent checkout except the explicitly noted API directory. The gate launcher used a small environment (PATH/HOME/TMPDIR plus the local test URL and Wrangler dotenv/log/metrics disabling). No environment/secret file was opened, copied or committed.

```text
bun install --frozen-lockfile
Checked 405 installs across 519 packages (no changes) [18.00ms]

bun audit
No vulnerabilities found (checked 459 packages) [697.00ms]

bun run typecheck
API tsc, web next typegen + tsc, and tsc --noEmit -p e2e/tsconfig.json: exit 0

bun run check
Checked 402 files in 98ms. No fixes applied.

bun run test:web
37 pass; 0 fail; 685 expect() calls

TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55432/folio_test bun run test
66 pass; 12 skip; 0 fail; 5143 expect() calls
MFA child: 11 pass; 0 fail; 308 expect() calls

bun run test:worker-storage
8 Workers storage regressions passed; no provider/database requests.

bun run test:worker-mail
15 Workers mail checks passed; all outbound traffic mocked, no real email/database/provider request.

bun run build
Generating static pages using 15 workers (49/49); exit 0

bun run --cwd apps/web build:cloudflare
Worker saved in .open-next/worker.js; OpenNext build complete.; exit 0

(cd apps/api && bunx wrangler deploy --dry-run --outdir ../../work/api-dry-run)
--dry-run: exiting now.; exit 0
```

The12 root conditional skips already exist on main;11 MFA cases execute in the enforced child suite and the fixture-cleanup case only applies to its separate manual fixture mode. No E2E test is skipped, disabled or retried. Next emitted a local outer-checkout tracing warning; OpenNext completed with its existing punycode deprecation warning. Neither gate failed. No failing gate was labelled pre-existing.

## Remote acceptance

[PR#4](https://github.com/2ve2/FolioCraft/pull/4) is open, unmerged. Initial [run39622808488](https://github.com/2ve2/FolioCraft/actions/runs/39622808488) on bcff8ba exposed actual clean-install harness defects:

```text
validate: error TS2688: Cannot find type definition file for 'node'.
e2e: Cannot find package 'drizzle-orm' from e2e/seed.ts
```

The E2E failure occurred after a successful production Next build, before browser tests. Workers succeeded and integration's test step succeeded. The artifact-upload step ran successfully but no Playwright report existed yet. These are not claimed to be pre-existing failures on main. The old local node_modules had extra hoisted packages. Correction: put the helper in apps/api/tests/fixtures/e2e-account.ts, keep a one-line root bridge, use declared Bun types (matching API type configuration), and reference the contracts type via its source entry. No new dependency or product change.

A completely new source copy under work/e2e-clean, with no node_modules or environment files, installed398 packages from the frozen lockfile. Both application typechecks and E2E typecheck passed. The final clean source then passed all eleven gates, including API integration on a second fresh loopback folio_test at port55433, separate from E2E at55432. API:66 pass/12 unchanged conditional skips/0 fail/5143 assertions; enforced MFA child11/0/308. Biome403 files, web37/0/685, storage8/8, mail15/15, Next49/49, OpenNext and API dry run exit0; audit reported no vulnerabilities. Fourteen implementation/configuration files were compared by SHA256 and all match this checkout. No gate failed in this clean repetition.

The final clean suite passed three consecutive complete production-build invocations:

```text
bun run --cwd work/e2e-clean test:e2e
43 passed (26.9s)
bun run --cwd work/e2e-clean test:e2e
43 passed (30.6s)
bun run --cwd work/e2e-clean test:e2e
43 passed (28.5s)
```

The eleven gate commands above were repeated from the clean checkout (API TEST_DATABASE_URL used loopback port55433); exact raw output is in ignored work/e2e-evidence/clean-gate-*.log. Corrective remote acceptance remains pending at this checkpoint.

## Human commands and unverified limits

Required provisioning, secret, migration or deployment commands: none. This adds test tooling only and changes no schema or application behaviour. The local setup commands in E2E.md are optional for rerunning the suite. Human review/merge is still required; this task never merges.

Not verified: real email or R2, image uploads (explicitly excluded; no placeholder skip), hosted persistence/authentication/cookie security, native staff MFA through Playwright, other browser/device engines, production performance or provider availability. The failure artifact uploader has not been forced to fail remotely; its actual path/configuration is reviewable and its report is generated locally. Traces contain disposable local session data, so retain them only for debugging. Scheduled/provider/production resources were not changed. Local process/database cleanup will be recorded after final verification.
