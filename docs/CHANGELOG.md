# Action log

## 2026-10-22 — Deployment readiness: migration command, email verification
- Scope (human request after PR #12): fix `bun run db:migrate` failing with missing BETTER_AUTH_SECRET/API_URL/WEB_URL in the human's checkout; turn signup email verification on; prepare exact steps for the backlog deployment, Sentry and the published-page cache. The human deploys; the agent does not access hosted systems or secrets.
- `apps/api/src/db/migrate.ts` now needs only `DATABASE_URL`, prints the target host and database (no credentials) and reports a readable error when the URL is missing or malformed.
- `TRIAL_SKIP_EMAIL_VERIFICATION="false"` in `apps/api/wrangler.toml` and `apps/api/wrangler.cache.toml`.
- Studio: an existing signed-in account whose email is not verified gets a confirm-your-email screen with a resend link, retry and sign-out, instead of a generic load error; `EMAIL_NOT_VERIFIED` in other studio operations shows the same message.
- Docs: OPERATIONS, CLOUDFLARE, API, ARCHITECTURE, LAUNCH, README, STATUS, DECISIONS; evidence `docs/evidence/2026-10-22-email-verification.md`.
- Checks: typecheck 0, Biome clean, web 58/58, guarded API 93 pass / 12 skip / 0 fail, Playwright 54/54; local production-mode verification flow (signup, blocked sign-in, link, sign-in, owned read) passed. Not deployed; hosted mail delivery not verified.

## 2026-10-22 — Full project audit and cleanup completed
- Cleanup: about 1,100 lines of verified-unused code, styles and tokens removed; documentation reorganized with history in `docs/archive/` (no content deleted).
- Visual identity: one font pair, one type scale, one weight per heading level, three radii, one accent family and one page column across every platform screen; measured on 102 screenshots before and after. Rules in DESIGN_SYSTEM.md.
- Review: four read-only reviewers (human-authorized helpers) reported 21 findings; 18 fixed with tests in separate commits, 3 low items left open with reasons. No IDOR, draft leak, XSS or open redirect was found.
- Final gates: audit clean, typecheck 0, Biome clean, web 58/58, API 93 pass / 12 skip / 0 fail, Playwright 54/54, OpenNext build 0. Evidence: `docs/evidence/2026-10-22-full-audit.md`. Not deployed.

## 2026-10-22 — Full project audit and cleanup (scope)
- Human request after Task 8: check everything, clean the whole project, and review fonts, sizes, layouts, visual identity and logos so the product looks professional.
- Steps, each in its own commit: (A) remove verified-unused code, files, styles and tokens; (B) documentation cleanup that keeps history in the archive; (C) visual identity review of every platform page in Arabic and English at 390/768/1440 with before/after screenshots; (D) correctness and security review with fixes for verified issues.
- Boundaries: no deployment, no hosted database or provider access, no secret inspection, no schema change. Tooling used only for analysis (for example knip through bunx) is not added to the project.

## 2026-10-22 — Studio startup evidence and handoff
- Published `9f2f92f` and `c69cd20` on `codex/studio-startup`, opened unmerged PR11 against main and attached it to this chat. No deployment.
- Recorded the formal80-before/80-after production matrix, exact request timing samples, whole-page and settled-transition CLS, fixed-frame geometry, eight real fixture screenshots, gate output and manual API-first/web-second commands in dated evidence. Final corrected implementation passes all13 gates, including54 Chromium journeys; the separate evidence-commit rerun also passed all13 commands (26/26 final command executions exit0).
- Updated STATUS/README handoff and API/decision/source/dependency/Cloudflare notes. No new resource/secret/migration is required. Cleanup:0 users remain locally; owned PostgreSQL stopped and4300/4301/4400/55436 closed. Source c69cd20 passed validate/workers/integration/e2e in GitHub run39836222837; final documentation-head CI is not preclaimed. Active source work:none; next action is human review/merge/manual deployment. Unrelated ADMIN_CONSOLE_TASK remains untouched.


## 2026-10-22 — Immediate, session-bound studio startup
- Reused the real workspace chrome, fixed content heading and preview geometry with neutral disabled data areas, a working language switch and one localized live status outside the busy subtree. A pre-paint preview measurement prevents the initial fallback scale from flashing.
- Added one mount-local hinted site read with cancellation, synchronous native-session checks, exact requester/session envelope matching and authenticated fallback. The human approved the two non-secret identifiers on2026-10-22; Site, cookie/auth/CORS/CSP options and ownership checks remain unchanged. Transient identity-free cross-tab mutation notifications cover native sign-in; unsupported browsers use sequential loading.
- Added API requester/no-site/401 and web mismatch/accessibility tests, seven real production browser journeys, fixed-chrome bounds and transition-CLS assertions. Moved the existing budget-aware real sign-in helper; original session tests retain their meaning. The test runner uses project-owned temporary space.
- Verification before final preview-scale correction: all13 commands passed (web58, API90/12 existing conditional skips plus MFA11, database Workers14, storage8, mail15, Chromium54, cache runtime16); a stronger subsequent assertion found Arabic preview-scale CLS0.02234. Four corrected locale/viewport transition tests now pass with CLS0. Final corrected source passed all13 gates again: frozen install439; audit539 clean; types; Biome463; web58/0/769; API90/12 unchanged conditional skips/0/5444, native MFA11/0/308 and database Workers14; storage8; mail15; Next/OpenNext50 routes; API dry run; Chromium54/54, all four transition CLS0; real local cache runtime16. Accepted remeasurement:80 after/80 formal before, overlap80/80, loading screens0/80, delayed editable medians1665–1685ms versus3185–3216ms. Detailed evidence/handoff is the next separate step.
- Affected source: studio components/styles/controller/startup read, portfolio preview measurement, API response/site route, contracts, web auth/API helpers and focused tests. API.md/DECISIONS.md/SOURCE_STRUCTURE.md describe the binding and responsibilities. No deployment or provider operation.


## 2026-10-22 — Studio startup (scope)

- Measure production Next/Bun/local PostgreSQL startup before and after, Arabic/English at 1440/390, ten runs per delay/viewport/locale cell.
- Render neutral accessible workspace chrome immediately; safely overlap hinted site reads with session verification, preserving authentication, ownership and in-memory-only data.
- Add focused regression coverage, run every required quality gate, record evidence and open an unmerged PR. No hosted operations or secret access. The later human approval permits only the private double-ID envelope extension; the reproduced main audit failure required compatible updates of existing dependencies.

## 2026-10-22 — Signed-in entry and tab-return session checks
- Scope: three human reports from the trial (loading page before the product page, loading page after returning to the tab, bare address not opening the studio while signed in). Branch `claude/modest-davinci-osg31w` restarted from `main` `1ec5337` after PR #2 merged.
- Fixed: a failed background session re-check (Better Auth re-checks on every tab return) no longer replaces an open studio/administration screen; `useAccountSession` reports errors only while no session is known.
- Added: identity-free `ichnara-signed-in` hint cookie and redirect rules so `/` opens the studio for a signed-in browser; `/ar` and `/en` still show the product page; privacy notice lists the cookies.
- Not reproduced: the product page has no loading screen on `main`; the trial may run a web build older than PR #2 (unverified).
- Evidence: `docs/evidence/2026-10-22-session-entry.md` (typecheck, Biome, web 43/43, Playwright 44/44 plus new 3/3, mutation check). Not deployed.

## 2026-10-22 — Public cache review fix: the minute retry no longer wakes the database
- Review finding: once the revalidation binding was configured, the `* * * * *` Cron queried PostgreSQL every minute even with nothing pending, which would keep Neon compute from scaling to zero (free compute allowance). The runbook did not mention it.
- Fix: a failed delivery writes a unique `pending` R2 object through the new API binding `PUBLIC_CACHE_SIGNAL` (same private `ichnara-portfolio-cache` bucket, no new resource). `cacheInvalidationService.retryPending` reads only that object; it opens a database scope only when pending, drains, and clears with an etag precondition so a concurrent new failure is never lost. Daily maintenance still drains everything as a backstop.
- Found by the real R2 runtime check, not the in-memory fake: R2 etags hash content, so identical empty marks shared one etag and an older read could clear a newer failure. Marks now carry unique content; the fake bucket now derives etags from content and a unit test asserts consecutive marks differ.
- Evidence: guarded API 88 pass / 12 skip / 0 fail (three new retry tests); cache test file 7/7; runtime (real workerd R2 + SQLite DO) 16 checks; four mutations (always open the database, unconditional clear, no mark on failure, constant mark content) each fail their test.

## 2026-10-22 — Published ISR implementation and acceptance
- Backend step gates: all11 commands exited0;42 web tests,85 API tests/12 existing conditional skips/0 failures,14 database Worker checks,8 storage and15 mail checks. Next/OpenNext builds and API dry run passed. The feature tree is verified before separate step commits.
- Backend step: additive generation outbox/migration, atomic site/owner/asset invalidation triggers, strict private delivery, affected-site prioritization, minute retry, published-only cache DTO and guarded trigger/concurrency tests. Existing draft/ownership/auth/asset guards remain.
- Frontend step: default-off internal ISR tree, official filtered R2/sharded SQLite tags, binding-only secret-checked expiration with persisted receipts, failure propagation, monotonic timestamps and late-render provenance; preview/public share the existing renderer.
- Verification: two complete11-gate sets passed before separate step commits;44/44 browser tests and15 real built-Worker local cache/fault/race checks, repeated successfully against the final build. PR#9 targets main and remains unmerged. Eleven-gate verification is recorded in the dated evidence. Manual resource/migration/deploy/enable/rollback commands are prepared in PUBLIC_CACHE.md; no external mutation was performed.

## 2026-10-22 — Published ISR clarification accepted
- Human explicitly approved the narrow fail-closed OpenNext patch and preparation of the private R2 Standard bucket/SQLite DO binding for use within the free allowance. This authorizes source/tests/runbooks only, never provisioning/deployment.
- Continue implementation with a separate internal ISR route tree reached only by the runtime-on Worker rewrite. The existing public dynamic routes remain the runtime-off path, so disabling bypasses existing full-route entries. Public/internal path rejection and local fallback require real runtime proof.
- Proposed persistence boundary: additive transactional outbox triggers cover publication/settings/moderation/deletion, native account bans/cascades and asset removal; no FK deletes pending invalidation intent. Preserve all existing rows/guards.

## 2026-10-22 — Published portfolio ISR (scope; design verification in progress)
- Start on `codex/published-isr` from freshly fetched/fast-forwarded main `afac7a3`, only in the independent checkout. Preserve unrelated untracked `docs/ADMIN_CONSOLE_TASK.md`.
- Verify the human-selected OpenNext R2 incremental cache and sharded Durable Object tag cache against official documentation and installed 1.20.11 source before application changes. Record the design, mutation paths, failure guarantees, free-tier limits and any required clarification in dated evidence.
- Intended implementation: default-off published-route caching, internal secret-protected Service Binding revalidation, transactional invalidation outbox with minute retries, all public-output mutation triggers, local regression/E2E coverage and cold/warm timing. Preserve dynamic localized unavailable responses, shared rendering, ownership, security headers and robots behavior.
- Stop for the human if the prescribed design contradicts upstream behavior or requires a new unapproved resource. No deployment, hosted database/provider operation, secret inspection or resource creation. All eleven quality gates precede any pushed commit; an unmerged PR follows completed work.

## 2026-10-22 — Platform color tokens (scope)
- Work on `codex/platform-color-tokens` from freshly fetched main `8b49fe2`, only in the independent checkout. Preserve unrelated untracked `docs/ADMIN_CONSOLE_TASK.md`.
- Inventory platform CSS color literals; extract exact semantic tokens without merging near-equal values, changing layout/behavior, or modifying owner-selected portfolio palettes. Preserve system high-contrast colors as documented exceptions.
- Capture real local before/after Playwright screenshots for landing, login, signup, privacy, terms, seeded Studio, native-MFA administration overview and localized 404, in both locales at390/768/1440. Require exact decoded-pixel equality; record contrast and every quality gate.
- Separate stylesheet-group commits, push branch and open an unmerged PR. No deployment, hosted database/provider operation, secret inspection, schema change or new dependency.


## 2026-10-22 — Hyperdrive review fixes (once-per-isolate check, direct fallback)
- Review finding 1: the origin `statement_timeout` guard ran as an `onConnect` query on every request's new client, adding one origin round trip per request to the path meant to remove round trips. It now runs once per Worker isolate through a separate short-lived client (`useHyperdrive` in `apps/api/src/db/hyperdrive.ts`); only plain values are kept across requests.
- Review finding 2: a failed guard rejected every database request (fail closed), an outage UptimeRobot's DB-free `/health` would not see. A missing/unsafe default or an unreachable Hyperdrive now keeps the request on the bounded direct `DATABASE_URL` path, logs `hyperdrive_unverified` (reason only, no connection data) and retries after 60 s.
- Tests (`hyperdrive.integration.test.ts`): once-per-isolate check proven with a 10 s origin default served on three requests and one check; unsafe (0, 16 s) and unreachable bindings fall back to the direct 15 s path with the warning and no connection data; no recheck inside the retry window. Mutations (per-request check; ignoring the check result) each fail their test. Guarded API 81 pass/12 skip/0 fail; Workers database 7/7 unbound and 7/7 bound.
- Pre-existing, unrelated: running the guarded suite twice back to back can fail auth tests (shared local rate budgets); the unmodified branch shows the same failures. Single runs and CI are unaffected.
- HYPERDRIVE.md: recommends creating the configuration in the Cloudflare dashboard (caching off) instead of the CLI stdin script, and documents the fallback event to watch.

## 2026-10-22 — Hyperdrive operational handoff complete
- Added HYPERDRIVE.md with exact secret-safe stdin/in-process-argv creation (query caching disabled), origin deadline preservation/restoration, separate unbound/bound API deployments, trial curl/timing projection and rollback for every step. README/Cloudflare/operations/source map link to it. No provisioning/deployment/hosted operation performed.
- Final password-authenticated acceptance14/14 commands exit0:all eleven gates, monitoring28/28 and both benchmark harnesses. Counts remain API79/0/5297 plus MFA11/0/308, database14/14, web37/0/685, storage8/8, mail15/15, Biome425, Next/OpenNext50/50. Initial two Service Binding runs had0ms median gain; final SCRAM run differs by1ms at coarse resolution. No repeatable edge benefit or production Service Binding is claimed.
- PR7 is open/unmerged. Corrected remote run39709019010 on194d189 passes all four jobs, including Chromium43 passed. Final documentation-head checks are not preclaimed. Cleanup:0 fixture accounts,0 residual deadline overrides, owned PostgreSQL stopped/55434 closed. Unrelated untracked ADMIN_CONSOLE_TASK.md preserved. Source work complete; human review and measured optional trial activation are next.

## 2026-10-22 — Local fixture password preservation verified
- `scripts/test-worker-database.ts` and `scripts/measure-worker-database.ts` now keep supplied local fixture passwords, generating a Miniflare placeholder only when absent. Initial PR7 integration run39708626819 independently reproduced the original bound-path authentication failure after unbound checks passed.
- Full verification against disposable local SCRAM-authenticated folio_test passes all eleven gates plus monitoring: API79/0/5297 and MFA11/0/308, workerd database14/14, web37/0/685, Biome425, storage8/8, mail15/15, Next/OpenNext50/50 and monitoring28/28. This correction changes test harnesses only; no product/provider authentication policy changed.

## 2026-10-22 — Password-authenticated local binding acceptance (scope)
- Final source review found that native-binding harnesses replaced an explicitly supplied local password with the trust-authentication placeholder. Preserve provided passwords and synthesize one only when absent; production source is unaffected. Verify all gates again against disposable local folio_test using SCRAM authentication before completing the operational handoff. No real/hosted password is read or changed.

## 2026-10-22 — Hyperdrive operational handoff (scope)
- Implementation completed in `ae1749f` after all eleven gates plus actual monitoring checks. Prepare exact manual stdin-only provisioning, origin deadline preservation/restoration, separate unbound/bound API deployments, public trial timing and safe-tail commands with per-step rollback. No external command is executed.
- Reconcile source/operations/Cloudflare/README/STATUS/evidence and rerun every gate before the documentation commit/push/PR. Preserve cancelled staging, disabled query caching and the no-Service-Binding decision.

## 2026-10-22 — Optional database path implementation verified
- Added optional HTTP/Cron Hyperdrive selection, fail-closed origin deadline verification and opt-in numeric pg timings; no active binding, query caching, dependency, schema or web routing change. Added explicit publication/rollback/deadline tests and doubled actual workerd database checks to both modes. Local-only harness restores the caller role/database deadline.
- Baseline and after measurements recorded in evidence/2026-10-22-hyperdrive-latency.md. Local binding cannot prove distributed pooling gains; HTTP/Service Binding have identical6ms medians, so no Service Binding ships. Synthetic accounts were cleaned after each run.
- All eleven gates and monitoring pass: API79/0/5297 plus MFA11/0/308, web37/0/685, database14/14, storage8/8, mail15/15, monitoring28/28, Biome425, Next/OpenNext50/50, API dry run exit0. Manual operational handoff and PR remain active. No hosted/provider action or secret inspection.

## 2026-10-22 — Optional Hyperdrive latency evaluation (scope)
- Start from fetched main `3f85e37` on `codex/hyperdrive-latency`; work only in the independent checkout. Preserve unrelated untracked `docs/ADMIN_CONSOLE_TASK.md`.
- Measure representative public/session/studio database connection and query time locally before changing routing. Evaluate optional cache-disabled Hyperdrive with unchanged unbound/Bun behavior, transaction/deadline evidence, and Service Binding only if measured latency warrants it.
- Prepare safe manual trial provisioning, before/after measurements and reversible rollout/rollback instructions. No staging, deployment, hosted database tests, secret inspection or external resource mutation. Run every requested gate before pushed commits and open a PR without merging.

## 2026-10-22 — Review fixes on the monitoring branch
- `workers` CI failed on this branch: `test:worker-monitoring` could not resolve the API alias `@aws-sdk/xml-builder/dist-cjs/index.js` from its generated config under `work/` on a clean install. Reproduced locally on a clean install; the harness now resolves the alias from `apps/api/package.json`. Result: 20/20, and 28/28 with `--web-built` after `build:cloudflare`.
- Removed the operator-status sentence ("external alert setup and activation have not yet been verified") from the Arabic and English privacy notice; rollout status stays in MONITORING.md/STATUS.
- Ported the Workers mail log-wait fix (PR #6) so the known log-delivery race cannot fail this branch's `workers` job.

## 2026-10-22 — Deterministic Workers mail log assertions
- `test:worker-mail` failed intermittently in CI (`server-error` on main run 39629329184, `network` on PR #5 run 39703232423) although the same tree passed elsewhere. Cause: Miniflare delivers structured logs on a separate channel that can trail the HTTP response, and the test searched the logs once, immediately.
- Proof: delaying every captured log line by 50 ms made the unchanged test fail at its first scenario. `scripts/test-worker-mail.ts` now waits (up to 5 s, polling) for the correlated log line and lets trailing lines arrive before the private-value scan. With the same 50 ms delay the fixed test passes 15/15; an intentionally wrong expected code still fails with "Missing correlated log: server-error".

## 2026-10-22 — Owner alert runbook and release handoff
- Implementation completed in2f69306 after all gates and28/28 local monitoring checks. Added MONITORING.md with owner-only data-region/project-IP-scrubbing/new-issue-email settings, two exact300-second no-database uptime monitors and interactive secret/build/deploy commands. No provider/deployment command was executed.
- Reconciled README, source/dependency maps, Cloudflare/operations notes and evidence. All15 documentation-step commands exit0, including Chromium43/43 (36.1s), workerd28/28 and unchanged raw bundle sizes. [PR5](https://github.com/2ve2/FolioCraft/pull/5) is open and unmerged. Cleaned0 remaining E2E accounts and stopped the owned database; ports4300/4400/55432 are closed. No hosted alert or provisioning success is claimed.

## 2026-10-22 — Server monitoring implementation and final verification
- Added exact Sentry 11.8.0 API and supported OpenNext server capture, shared beforeSend privacy/collection policy, real deployment-version binding, no-DSN bypass and no browser SDK/CSP change. Expected 4xx are excluded; API/Web 5xx, exceptions and Cron failures are captured.
- Added isolated SDK event capture for HEAD/OPTIONS after confirming automatic wrappers skip them. The regression exposed inherited last-event identity suppressing a later web failure; per-request identity comparison and isolated per-event scope correct it. Final focused workerd run28/28 passes, including ingestion failure preserving the application response.
- Added provider-free web /health, bilingual privacy provider disclosure/draft-notice assertions, and CI mocked-ingestion coverage against actual generated OpenNext. Uptime probes are exactly API /health and prerendered /en; local proof shows zero API/database calls for those paths.
- Final isolated source passes all eleven required gates plus web dry run,28 mocked workerd checks,7 database runtime checks and43/43 Chromium checks. API75 pass/12 unchanged conditional skips/0 fail/5264 assertions plus native MFA11/0/308; web37/0/685; Biome419 files; Next/OpenNext50/50. API5130.08 KiB/gzip938.15; web9695.11 KiB/gzip1996.45. Source/config parity491 files, zero mismatches. Commit/push/PR and final operational handoff remain active. No deployment/provider action or schema change.

## 2026-10-21 — Owner monitoring (scope; provider selected)
- The human cancelled the staging task completely. No staging files, commits, provider resources or deployments were created; the unused local staging branch contains no task changes.
- Prepare structured private error monitoring for both trial Workers, Cron outcomes and release identifiers, plus an independent uptime monitor. Research current official costs/limits/privacy and obtain the human's provider choice before adding any SDK or account.
- Work in the independent GitHub checkout only, on codex/owner-monitoring from freshly fetched main 97bfd30. Preserve the pre-existing untracked docs/ADMIN_CONSOLE_TASK.md.
- Human selected Sentry Developer + UptimeRobot Free. Capture is server-side only, disabled without Worker-secret DSN, no browser SDK/CSP changes, no tracing/replay/profiling, trial and deployed-version tags, outgoing allowlist in beforeSend, no 4xx; local workerd ingestion proof, bilingual privacy notice retaining draft warning, web health, bundle measurements and all quality gates before PR. Check official OpenNext support; do not force an unsupported web SDK. Uptime targets only API /health and prerendered web /en, never /ready or portfolios. No deployment, hosted database tests, account creation or provider mutation.
- Completed locally: official-source comparison, code inspection and isolated unchanged-main baseline (398-package frozen install, OpenNext build and API/web dry runs all exit 0). Compressed API/web bundles are 830.91/1374.16 KiB. Active: awaiting the required provider choice; no SDK/runtime changes or task commits yet. External alert delivery and production acceptance remain unverified.

## 2026-10-21 — Review hardening of the save-before-language-switch check
- Review mutation test: changing the studio's `await flush()` before `switchLocale` to a non-awaited save still passed the E2E suite, because the old assertion read the URL at the instant the held save request started, before a premature soft navigation could commit.
- Fix in `e2e/journeys.spec.ts`: while the save is held, `page.waitForURL` for the other language must time out (2 s window, far longer than one local RSC round trip); then the URL is asserted unchanged.
- Evidence: with the mutation, 2 failed (ar and en) at the new assertion; with the real code, journeys 5/5 passed. After merging main (PR #3), the full suite passed 43/43 three times locally (Chromium 141 locally; CI uses the pinned Playwright browser), guarded API 69 pass/12 skip/0 fail and Workers database 7/7.

## 2026-10-21 — Browser E2E acceptance complete
- PR4 remains open and unmerged. Corrective run39624159815 on69da0f1 is green for all four jobs; actual browser reporter43 passed (41.1s), full job approximately2m08s. Final clean local suite43/43 three consecutive times and all eleven quality gates pass. No product source changed after this acceptance.
- Updated STATUS/evidence with the initial failed clean-install run, actual corrected CI success, exact local outputs, clean-source parity, explicit unverified boundaries and cleanup. Added only fulfilled E2E roadmap checkboxes.
- Verified0 generated E2E accounts, stopped both test databases plus API/web and confirmed4300/4400/55432/55433 closed. No deployment, provider mutation, new secret or production migration. Human review/merge is next; no active source work or scope blocker remains.

## 2026-10-21 — Clean-install harness correction completed locally
- Moved the native account/budget fixture to apps/api/tests/fixtures/e2e-account.ts; e2e/seed.ts is a bridge. E2E uses declared Bun types and a source-entry type-only contracts import. No additional dependency or runtime change.
- Clean source-only copy installed398 packages with the frozen lockfile. Typechecks and all eleven gates passed; Biome403 files, web37/0/685, API66/12 conditional skips/0/5143 with MFA11/0/308, storage8/8, mail15/15, Next49/49/OpenNext/API dry run exit0. API ran on a second isolated local folio_test:55433 to avoid touching browser tests on55432.
- Clean E2E43/43 passed three times (26.9s,30.6s,28.5s). Fourteen tested source/config files are byte-identical to the commit checkout. Corrective push and actual green CI remain the next action; initial remote failures are retained honestly in the dated evidence.

## 2026-10-21 — Clean-install CI correction (scope and diagnosis)
- PR#4 initial run39622808488 failed: validate could not find root node type definitions; E2E built Next but could not resolve drizzle-orm from the root seed helper. Fresh checkout dependencies differ from the pre-existing local dependency directory; these are new harness defects, not labelled pre-existing product failures.
- Move the database helper into its declaring API workspace with a one-line root bridge, use the declared Bun typings and relative type-only contracts import, and reproduce all gates on a freshly installed source-only copy. No product/security/provider change and no additional dependency. Clean frozen install and both app/E2E typechecks already pass; clean E2E first run43/43. Remaining repeatability/gates and rerun CI are active.

## 2026-10-21 — Browser CI job prepared
- Added a separate e2e job with PostgreSQL18, pinned Bun1.4.2 and Node22, matching Chromium installation, ten-minute timeout and failure-only seven-day HTML/trace/screenshot artifacts. The existing validate/workers/integration jobs remain intact.
- The same locally verified source tree passed all eleven required gates before this commit; no application code changed. Actual remote acceptance is pending push/PR creation and will be recorded separately.

## 2026-10-21 — Local browser suite completed
- Added43 committed Chromium checks, local-only API/PostgreSQL/production Next orchestration, unique native fixtures and scoped verified account cleanup, exact-origin browser networking, strict script checks with negative controls, and root scripts/typecheck.
- Actual evidence:43/43 three consecutive local runs; all eleven required gates exit0. Web37/0/685, API66/12 conditional skips/0/5143 plus MFA11/0/308, storage8/8, mail15/15, Next49/49 and both Worker builds/dry-run pass. See evidence/2026-10-21-playwright-e2e.md for exact output, files, design and limits.
- No application/security/schema/provider change, no deployment. CI implementation/push/PR acceptance is the next separate step.

## 2026-10-21 — Deterministic browser E2E suite (scope)
- Human-authorized: committed Playwright journeys in Arabic/English against real Bun API, isolated local folio_test and a production Next build; add CI PostgreSQL job with failure reports/traces. Target three consecutive local passes and a green PR job.
- Work only in the independent GitHub checkout on codex/playwright-e2e from freshly fetched main ba37ac6. Preserve the pre-existing untracked docs/ADMIN_CONSOLE_TASK.md.
- No deployment, hosted database/provider access, real email or image uploads. Keep authentication, ownership, CSP and rate limits intact. Record actual gates, runtime evidence and remaining limits.
## 2026-10-21 — Proven Worker socket shutdown defect fixed
- After three local error-identity traces and a fail-before workerd assertion, patched pg-cloudflare 1.4.1 normal end() to close its writable stream gracefully; forced destroy and actual disconnect errors remain unchanged. Reader cancellation was experimentally rejected, not shipped. No dependency upgrade, migration, TLS/security configuration, timeout, pool size or transaction change.
- Added the test-only Worker fixture and a guarded workerd runner after the root API suite. Seven checks prove clean close, one-client transactions/rollback, twelve isolated concurrent connections, actual scheduled maintenance, retained 57P01 and recovery. Updated package/lock patch registration, source map, decisions, operations/capture instructions, STATUS and dated evidence.
- Final requested gates all exit 0: frozen install; audit 456 packages/zero vulnerabilities; both typechecks; Biome 396 files; web 37/0/685; API 69 pass/12 unchanged conditional skips/0 fail/5207 plus MFA child 11/0/308 and seven workerd checks; storage 8/8; mail 15/15; Next 49/49; OpenNext; API dry run. Repeated actual local API HTTP flow: eight pool errors before, zero after; synthetic users cleaned, test servers/ports closed.
- No deployment, hosted tail, Neon or provider access. Historical hosted causes and TLS/provider/browser acceptance remain unverified; human API-only rollout and projected-event capture are documented in OPERATIONS.

## 2026-10-21 — Safe pool diagnostics completed
- Added finite error-name/code sanitization, request/scheduled/shared stage and actual pg ending/ended state; three tests cover metadata, redaction and hostile fields. No pool lifecycle, size, timeout, severity, ownership or transaction change.
- All eleven requested gates passed on this diagnostic source: web 37/0/685 assertions; guarded API 69 pass/12 existing conditional skips/0 fail/5207 assertions plus enforced MFA child 11/0/308; storage 8/8; mail 15/15; Next 49/49 and OpenNext build, API dry run, install/audit/typecheck/Biome passed.
- Local workerd reproduces normal-end pool errors and distinguishes forced PostgreSQL shutdown (57P01) and statement deadline (57014). Exact provenance was proven in three socket traces. A narrow shutdown fix and regression proof are the next step; no hosted cause is claimed.

## 2026-10-21 — Database pool error investigation (scope)
- Trace request, scheduled and shared database lifetimes and all potential post-response work. Add bounded, allowlisted pool diagnostics and sanitizer tests; reproduce only against a disposable local folio_test PostgreSQL database in workerd where possible.
- Preserve transactional publication, per-request isolation, timeouts, pool sizes and severity until a cause is proven. If hosted causality remains unknown, deliver diagnostics and a safe human-operated deployment/capture procedure only.
- Run all requested gates, record exact evidence and limits, commit completed work on codex/pool-error-diagnostics, push and open a PR. No deployment, hosted database access, secret inspection or provider mutations. Existing untracked docs/ADMIN_CONSOLE_TASK.md is outside scope.

## 2026-10-20 — Language path prefixes and single-language pages completed locally
- Done on branch claude/modest-davinci-osg31w (restarted from main after PR 2ve2/FolioCraft#1 merged): platform pages under `/ar` and `/en`, config redirects for old URLs, provider-based interface language, removal of the loading-screen language gate, path-based email language, and fixes for every page that mixed Arabic and English (portfolio error page, tab titles, prefixed 404s, logo label, preview bar).
- Affected: apps/web (app/(platform)/[locale], app/(portfolio), global-not-found, next.config.ts, lib/locale*, lib/request-locale.ts, lib/use-interface-locale.tsx, 65 links across features, tests), apps/api mail templates and test, docs.
- Checks: typecheck 0; Biome 392 files 0; web 37/0; guarded API 66 pass/12 skip/0 fail; Workers storage 8/8 and mail 15/15; next build and OpenNext build exit 0; browser and local-workerd evidence in docs/evidence/2026-10-20-locale-routing.md.
- Not done: no deployment. No database migration is needed for this change.

## 2026-10-20 — Language path prefixes (scope)
- Human report: page changes look like crashes/refreshes; human asked for a root fix rather than a patch, and later for pages that never mix Arabic and English. Scope: move the interface language from `?lang=` into the path, keep old links working, remove client-side language restoration, and audit every platform page in both languages. No deployment, migration or provider access.

## 2026-10-20 — Audit fixes completed locally; push blocked
- Completed on branch claude/modest-davinci-osg31w: every scoped item recorded in the entry below, one commit each, with evidence in docs/evidence/2026-10-20-audit-fixes.md (sections 1–15). Final local gates are listed in STATUS.md.
- Affected areas: packages/contracts (ids), apps/api (schema, migrations 0008–0009, services, worker scheduled handler, mail templates, tests), apps/web (route groups, security headers, legal pages, styles, tests), CI workflow, docs.
- Not done: no deployment, no Neon migration, no provider access. Push refused with HTTP 403 (GitHub App access); awaiting the human.
- STATUS.md was shortened to a one-page continuation point; its previous content moved unchanged to STATUS-ARCHIVE.md.

## 2026-10-20 — Audit fixes on claude/modest-davinci-osg31w
- Scope (human-authorized after the read-only audit): fix confirmed audit findings that need no external resources, adopt `@paralleldrive/cuid2` identifiers (human request), and document each step. Planned order: flaky keyset test; cuid2 ids with a reviewed, data-preserving migration; web security headers; server-rendered Arabic `lang/dir`; focus visibility; user-link `rel`; 503 for unavailable public pages; CI parity with the deployed build; draft legal pages; bilingual mail templates; scheduled cleanup, release retention, R2 cleanup on account removal and complete data export; unused dependency removal; stale documentation.
- Limits: no deployment, no Neon/R2/Resend access, no secrets, no production migration. Evidence per step: `docs/evidence/2026-10-20-audit-fixes.md`.

## 2026-10-20 — Human confirms trying the repaired mail path
- After the concrete HTTP change and passing test results were reported, the human explicitly requested sending from the new solution. Treat this as confirmation to deploy the API once and perform one further native reset-email test to the already privately supplied address. No web deployment, password/account/role change, R2 operation or direct production database access. A native reset may create its own temporary verification record; no credential change is attempted.
- Next: fresh remote API version/binding preflight, preserve existing secrets, deploy reviewed HTTP code with its explicit transport variable, verify startup/active binding names, then correlate one browser request with sanitized mail events. No delivery claim without human mailbox confirmation.

## 2026-10-20 — Password-reset mail diagnosis and API-only transport repair started
- Human reports generic browser success with no Resend Emails attempt. Authorized scope: inspect installed Better Auth and mail lifetime, implement a locally proven transport/diagnostic fix, run required gates, commit and push code/docs. No web, R2, production database, account or role changes. API deployment requires a separate confirmation after reporting the finished change in this chat.
- Human additionally authorizes a real test email to their own address; destination is pending. This does not waive the explicit deployment confirmation gate. No real email has been sent in this task.
- Initial installed-code finding: without advanced.backgroundTasks.handler, reset and signup/sign-in verification await runInBackgroundOrAwait; that helper catches callback errors, so a generic reset success is not evidence of provider acceptance. Unknown-recipient reset also deliberately returns generic success without invoking mail. Exact hosted SMTP failure remains unproven.

## 2026-10-20 — Hosted upload copy failure isolated; bounded R2 probe authorized
- Human reproduced the hosted failure while sanitized Worker diagnostics were connected. Actual event: storage_provider_failure, stage verify-copy, kind provider, status200. The flow reached the conditional storage copy after metadata/read/image validation; the specific SDK/provider failure is not yet identified. The supplied screenshot confirms incomplete asset cards and the generic storage error, not a completed upload.
- Human explicitly permits creating a small synthetic image under a unique temporary R2 prefix, copying it with application-equivalent options and deleting only those probe objects. No user-image access/deletion, CORS change, deployment, database/role mutation or push is authorized. Record sanitized response metadata only and verify cleanup using exact generated keys.
- Bun synthetic PUT/head/conditional-copy/download succeeded with byte-identical content and both generated keys verified absent after cleanup. The same application-equivalent options bundled by Wrangler and run in local workerd reproduced ReferenceError/status200; allowlisted message tokens identified DOMParser. The destination existed despite the error, proving a response-deserialization failure rather than failed remote copying. Both generated keys again verified absent.
- Installed source confirms Wrangler's browser resolution selects @aws-sdk/xml-builder/dist-es/xml-parser.browser.js, which requires DOMParser. The same installed package has a pure JavaScript non-DOM parser in its CommonJS export. bun info confirms3.972.41 is current and matches the inspected SDK dependency. Implemented surgical fix: direct compatible XML utility dependency and a Workers-only build alias to the package's non-DOM entry, retaining SDK protocol/errors and unchanged conditional-copy/image ownership validation.
- Actual corrected local workerd/real R2 probe: copy200 with ETag, downloaded image bytes equal the generated95-byte original, expected MIME/private no-store retained and both exact generated keys verified absent after cleanup. No user objects or database rows touched. The earlier baseline could create the destination and still report parser failure; do not clean those real user remnants under the synthetic-only authorization.
- Added scripts/test-worker-storage.ts, its non-deployed API test fixture and root test:worker-storage command. Actual six-case bundled Workers test passes valid XML/date/ETag,403,412,embedded200 error,malformed and empty XML while retaining the signed conditional-copy header; no live network/provider/database use. Full API dry-run exits0 and the bundle has the SDK non-DOM parser/no DOMParser. bun run check357 files, typecheck API/web and test:web31/636 all exit0. Database integration/migrations and OpenNext not rerun for build-only API change; earlier UI production build/41 Chromium checks remain.
- Independent checkout: frozen install with project-local writable Bun paths exit0/419 installs across556 packages, then test:worker-storage exit0/all6 cases. Verified scoped source/lock/config bytes synchronized before committing; generated next-env.d.ts/preexisting ADMIN_CONSOLE_TASK.md remain excluded.
- Documented corrected tooling failures without claiming failed commands passed: writable TMPDIR/BUN_INSTALL required for install; Wrangler must run via bunx/from API context; Miniflare5 requires options conversion/module root/native fetch. All diagnostic processes stopped and synthetic cleanup verified. Sync and separately commit this upload fix, with no push/deployment. Hosted end-to-end acceptance follows a separately authorized rollout.

## 2026-10-20 — Upload and authentication UX corrections started
- Human reports broken hosted image uploads, oversized upload-error presentation, an English flash on Arabic reload, redundant platform naming in authentication forms, misplaced reset/verification actions, text remaining on loading buttons and intermittent onboarding during sign-out.
- Scope: inspect current upload/runtime adapters and frontend session/locale flows; make surgical local fixes with focused regression tests, then record actual checks and synchronize separate commits to the independent checkout. No deployment, push, production database/provider mutation or real account changes are authorized by this task.
- Hosted upload resolution requires actual hosted evidence after a separately authorized rollout; local tests must not be presented as provider acceptance.
- Completed local frontend step: neutral locale-hydration artwork and synchronized hooks; explicit sign-out transition/localized login navigation; removed repeated auth-card branding; contextual recovery links; reusable spinner-only pending content with retained dimensions/accessibility; bounded upload feedback. Source changes are confined to apps/web, with new auth recovery-link/control modules and four regression tests. No backend or provider behavior was changed speculatively.
- Actual verification: bun run check exit0/355 files; bun run typecheck exit0; bun run test:web exit0/31 pass/636 assertions. QA production build exit0/25 static pages plus dynamic routes. Production-build Chromium41 checks passed/zero runtime exceptions with mocked API/auth/upload responses, both locales and320/390/1280 viewport samples; screenshots inspected. Browser regression explicitly covers both failed and successful logout and detects onboarding across document navigation. Initial CSS-module SSR test expectations were corrected; actual CSS was checked in Chromium. Full API/database and Cloudflare/OpenNext checks not rerun for frontend-only changes.
- Read-only live R2 CORS inspection confirms canonical-origin PUT/Content-Type permission; no bucket policy or objects were changed. A sanitized live storage-diagnostic listener discards all raw events and awaits a user upload reproduction. Hosted upload root cause and acceptance remain unknown; next action is capture the failing stage/code before a targeted backend/provider repair. No push/deployment or real account mutation.

## Earlier entries

Entries from 2026-10-13 to 2026-10-20 that were written in chronological order are in [archive/CHANGELOG-2026-10-13-to-2026-10-20.md](archive/CHANGELOG-2026-10-13-to-2026-10-20.md), unchanged.
