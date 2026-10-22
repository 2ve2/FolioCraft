# Studio startup — 2026-10-22

## Problem and design

Main `a7eb3d3` hides the workspace behind sequential session and owned-site requests. Branch `codex/studio-startup` was created from freshly fetched main in the independent GitHub checkout. The initial production baseline and neutral-frame/cancellation design were recorded before application implementation. The later human-approved server binding and measured preview correction are described separately below.

Reuse the real sidebar/header/editor/preview layout and fixed public labels. Account/draft areas contain neutral blocks, never invented data. Only language switching works during startup; other controls are disabled. One visually hidden localized live status, outside the busy subtree, updates after ten seconds. Static blocks have no animation, including reduced motion. Keep full-screen errors/retry and sign-out; a verified absent site goes directly to onboarding.

Start one page-local site read alongside session verification only with the existing identity-free hint and transient cross-tab observation. Subscribe before starting; invalidate on native mutation, cross-tab event, identity change or unmount. Verify the native session synchronously before and after awaiting. Discard failed/401/mismatched speculation and use the existing authenticated read. No private persistent cache is introduced.

Installed Better Auth1.7.7 broadcasts sign-out/updateUser through storage but omits cross-tab sign-in. The human explicitly approved a stronger private response binding on2026-10-22: only requester `userId` and native session-record `sessionId`, outside `Site`, never a token/secret, never logged, and still private/no-store. Both must exactly match the successfully checked session. The route derives them from the same existing `requireAuth` context that authorizes the owned read. Missing metadata on an older API triggers authenticated fallback.

An identity-free transient BroadcastChannel mirrors native mutation signals between open application tabs; the receiver invalidates speculation and refetches the unchanged native session atom. No IDs/private values are sent or persisted. If the channel is unavailable, startup remains sequential. The Better Auth client option object, `useAccountSession`, cookies, CORS and CSP are unchanged. Backend ownership remains authoritative.

## Files and behavior

- Studio skeleton/style, real sidebar/header/preview and extracted `sections/content-header.tsx`: shared chrome/geometry, neutral data, disabled controls, localized status and real language switching.
- `use-studio-controller.ts`, `startup-site-read.ts`, `use-startup-site-read.ts`, web API/auth helpers: mount-local speculation, cancellation, synchronous native verification and safe fallback.
- API response helper/site GET, shared contracts, API requester tests and web mismatch tests: exact double-ID binding, unchanged Site DTO, private401/no-store behavior.
- `portfolio-preview.tsx`: initial device scale is measured before paint, preventing the existing390px fallback scale from flashing before the real width.
- Browser fixtures/session tests, seven startup journeys and project-owned E2E temporary directory: real authentication within its unchanged native budget, held responses, geometry and session-change regressions. Original session tests retain their meaning.
- API, decisions, source structure, dependency/deployment notes, changelog, status, screenshots and numeric evidence document the final contract and verification.

## Measurement method

Production Next build/start on4301, existing production-policy local proxy4300, Bun/Hono API4400, owned loopback PostgreSQL55436 database `folio_test`, Chromium at900px height. A generated real account with a real site and the existing hint is reused within each matrix; every sample opens a new page. Ten samples per Arabic/English ×1440/390 ×0/1500ms response-delay cell:80 before and80 after. Delayed routes fetch real API responses before holding each1500ms. No fabricated response bodies.

First visible UI and first editable profile input are sampled with requestAnimationFrame from navigation, after loaded layout CSS is observed. Resource timing records only allowlisted API pathnames and numeric start/end times. Fonts settle before the final whole-page CLS observation. Initial/loaded fixed-frame bounds are compared. The fixture has no stored assets and storage is unconfigured: zero asset URL requests; asset-backed waterfalls are not verified.

The exploratory untouched baseline used Next16.4.0. Audit reproduced two advisories on main's original lockfile, so the formal before matrix was repeated with the same Next16.4.1/OpenNext1.20.13 pair used after. The accepted comparison uses that formal baseline, avoiding dependency-version attribution.

Local reproduction commands (the measurement harness/raw logs are ignored, project-owned artifacts):

```sh
TMPDIR="$PWD/work/studio-startup/tmp" TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55436/folio_test bun --no-env-file scripts/test-e2e.ts --config=work/studio-startup/measure.config.ts
python3 work/studio-startup/gates.py accepted
```

The source-only gate copy installs its own frozen dependencies and receives only isolated loopback test configuration, project temporary paths and disabled dotenv/metrics flags. No hosted environment file is opened or copied.

## Before/after medians

| Delay | Locale | Width | UI before | UI after | Editable before | Editable after | Page CLS after |
|---|---|---:|---:|---:|---:|---:|---:|
| 0ms | ar | 1440 | 223.4ms | 48.1ms | 223.6ms | 186.5ms | 0.00078 |
| 0ms | ar | 390 | 212.7ms | 45.6ms | 212.8ms | 177.2ms | 0.00219 |
| 0ms | en | 1440 | 212.2ms | 40.5ms | 212.3ms | 178.6ms | 0.00073 |
| 0ms | en | 390 | 214.0ms | 40.4ms | 214.2ms | 174.0ms | 0.01722 |
| 1500ms | ar | 1440 | 3215.4ms | 47.1ms | 3215.6ms | 1684.8ms | 0.00078 |
| 1500ms | ar | 390 | 3188.2ms | 44.1ms | 3188.2ms | 1679.7ms | 0.00219 |
| 1500ms | en | 1440 | 3184.9ms | 40.5ms | 3185.1ms | 1684.1ms | 0.00073 |
| 1500ms | en | 390 | 3184.7ms | 37.6ms | 3184.7ms | 1665.1ms | 0.01722 |

Median session/site request intervals in milliseconds from navigation:

| Delay | Locale | Width | Session before | Site before | Session after | Site after |
|---|---|---:|---:|---:|---:|---:|
| 0ms | ar | 1440 | 152.1–175.4 | 184.5–196.0 | 134.0–149.4 | 139.4–153.2 |
| 0ms | ar | 390 | 149.9–165.8 | 174.4–186.1 | 128.0–142.4 | 134.5–147.3 |
| 0ms | en | 1440 | 149.1–169.1 | 180.3–189.1 | 128.8–144.5 | 131.3–145.1 |
| 0ms | en | 390 | 151.9–170.3 | 180.2–189.2 | 126.7–143.0 | 131.4–145.4 |
| 1500ms | ar | 1440 | 152.5–1675.0 | 1678.8–3189.5 | 134.9–1653.4 | 138.9–1656.7 |
| 1500ms | ar | 390 | 131.5–1647.1 | 1653.7–3165.5 | 131.6–1655.2 | 134.8–1652.1 |
| 1500ms | en | 1440 | 129.3–1646.1 | 1650.3–3159.6 | 137.8–1657.1 | 142.7–1659.9 |
| 1500ms | en | 390 | 126.5–1643.8 | 1648.2–3162.0 | 120.9–1641.6 | 125.6–1644.2 |

The request timing samples, individual first-UI/editable/CLS observations and medians are retained in [numeric evidence](2026-10-22-studio-startup-metrics.json). The baseline has0/80 overlapping session/site reads and80/80 full-screen loading appearances. The final result has80/80 overlaps and0/80 loading-screen appearances. No hosted improvement is claimed. The maximum measured fixed-frame delta is0.1875px; the expanded browser checks allow at most1px.

## Layout evidence

The fixed sidebar/header/editor/preview and mobile layout retain their bounds. Browser assertions additionally compare the preview toolbar, expansion row, canvas, browser bar, content navigation, first editor-card origin/width and language trigger within1px. Unknown document content height is deliberately excluded. Mobile's hidden preview is excluded from visible geometry assertions.

A stronger transition test initially found CLS0.022339 in Arabic desktop even though fixed panel bounds were unchanged. Browser source rectangles identified the private preview's390px initial fallback width expanding to634px after paint. Moving only the initial measurement/observer setup to a layout effect fixes that flash. Four focused final transitions, after fonts settle and with both API responses held, each report CLS0. This is transition CLS, distinct from whole-page navigation CLS in the80-run table. No assertion was loosened.

Screenshots of the real held-response frame and loaded fixture are retained for [Arabic desktop](../screenshots/studio-startup-frame-ar-1440.png), [Arabic mobile](../screenshots/studio-startup-frame-ar-390.png), [English desktop](../screenshots/studio-startup-frame-en-1440.png) and [English mobile](../screenshots/studio-startup-frame-en-390.png), with adjacent `studio-startup-loaded-*` pairs. No account data appears in the skeleton; loaded screenshots use generated local fixtures.

## Verification

All13 commands passed on the final corrected implementation before commit `c69cd20`. Raw logs are under ignored `work/studio-startup/accepted-final-*.log`; the gate index records13 exit0 values. A separate full rerun before the final evidence commit also passed all13 commands with the same test/check counts:26/26 final command executions exit0 (`accepted-final-gates.json` and `handoff-gates.json`). Exact commands and observed results:

```text
bun install --frozen-lockfile
  439 packages installed; exit0
bun audit
  No vulnerabilities found (checked 539 packages); exit0
bun run typecheck
  API tsc, Next route types/tsc and E2E tsc; exit0
bun run check
  Checked 463 files. No fixes applied; exit0
bun run test:web
  58 pass / 0 fail / 769 expect() calls
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55436/folio_test bun run test
  90 pass / 12 existing conditional skips / 0 fail / 5444 expect() calls
  enforced MFA child:11 pass / 0 fail / 308 expect() calls
  real database Workers:7 unbound +7 local optional binding passed
bun run test:worker-storage
  8 Workers storage regressions passed
bun run test:worker-mail
  15 Workers mail checks passed (mocked outbound traffic)
bun run build
  Next16.4.1:50/50 static routes; exit0
bun run --cwd apps/web build:cloudflare
  OpenNext1.20.13:OpenNext build complete; exit0
(cd apps/api && bunx wrangler deploy --dry-run --outdir ../../work/api-dry-run)
  dry run complete; exit0; no deployment
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55436/folio_test bun run test:e2e
  54 passed (2.0m); no new skips/retries
bun run test --public-cache-runtime
  16 real local built OpenNext/workerd/R2/SQLite runtime checks; exit0
```

Browser coverage uses real generated accounts, native auth and owned-site operations. Both session/site requests must start before either held response is released. The single status, no fabricated account/draft data, disabled controls, working language switching, reduced motion, ten-second slow message, onboarding, native cross-tab sign-out, invalidation/fresh fallback, no full-screen normal loading and exact visible geometry are checked. All four settled skeleton-to-loaded transition CLS values are0 in the complete54-test run. Focused web tests reject a mismatched requester ID, session ID and missing binding; API tests assert exact envelope keys and requester ownership without logging IDs or selecting tokens. No existing test was skipped, disabled, quarantined or weakened.

## Verification corrections and dependency prerequisite

- Main's original manifests/lockfile reproduced Next16.4.0 high GHSA-p3m5-59mp-jv5r and critical GHSA-2464-fhr4-w9xw audit failures. `bun info next@16.4.1 --json` and adapter1.20.13 metadata confirm stable paired releases, Node>=20.9, React19 and Next>=16.4.1 compatibility. Existing dependencies only; no new direct dependency. The two cache reliability patch hunks are preserved; upstream now includes the preview-props manifest entry. [Server Actions advisory](https://github.com/advisories/GHSA-p3m5-59mp-jv5r), [image optimization advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw).
- Shared dependency links let an intermediate bundler resolve unpatched Next outside the check copy. A fresh frozen install inside the copy fixes that harness issue. This did not independently prove the older adapter incompatible; the maintained pair is the tested choice.
- System temporary-directory quota required project-owned temporary paths; no unrelated temporary data was deleted.
- An intermediate shell-only snapshot accidentally included parallel-barrier tests, so it was stopped and rerun with matching tests. It is not a passing final result.
- An intermediate benchmark discovered a copied second matrix and overlapped another database run. Those results were rejected. Final discovery explicitly excludes both source-copy directories, reports one test, and all final database work is serialized. The original formal baseline was preserved.
- An early API test assumed a separate native HTTP response contained a session without checking status, then failed on a missing property; its exact status is unknown. The corrected test selects only the generated requester's sole session record ID, never its token, and still verifies the real private-route requester, empty-site case and signed-out401. No native rate limit was changed.
- Outer bounds alone missed an86px preview-canvas movement. Reusing real preview chrome and the fixed content header corrected it; expanded geometry assertions and the independent CLS regression now cover the visible transition.

## Manual rollout after review/merge

These commands are prepared for the human; none has been executed. No new resource, secret, cookie configuration or schema migration is required. Preserve existing secrets. Deploy API first so web can use the new binding immediately; an older API safely causes a fresh authenticated read.

```sh
cd ~/Desktop/blog-website/work/github-upload
git switch main
git pull --ff-only origin main
bun install --frozen-lockfile
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bun --no-env-file x wrangler deploy --config apps/api/wrangler.toml
API_URL=https://api.lord2ve.tech NEXT_PUBLIC_API_URL=https://api.lord2ve.tech NEXT_PUBLIC_WEB_URL=https://lord2ve.tech NEXT_TELEMETRY_DISABLED=1 CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bun run --cwd apps/web build:cloudflare
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false bun --no-env-file x wrangler deploy --config apps/web/wrangler.toml
```

After rollout, the human should inspect returning sign-in, both languages/widths, real sign-out/account-switch behavior and independent API/web health with existing runbooks. Do not log private envelope values. This session does not claim hosted acceptance.

## Limits and handoff

No deployment, Cloudflare/Neon/R2/Resend resource/account mutation, hosted application/provider test, hosted database test or production migration occurred. GitHub branch/PR publication is explicitly authorized. No secret was inspected, copied or committed. No hosted cold-start/Neon autosuspension, real asset/R2 upload, mail, physical device, Firefox or WebKit evidence is claimed. Chromium and local generated data only; the response delay is a simulation. Whole-page CLS and settled transition CLS are different measurements. Cross-tab sign-out and identity-free invalidation are real browser tests; exact mismatched account/session bindings are focused unit/API tests, not a hosted multi-account acceptance claim.

The unrelated untracked `docs/ADMIN_CONSOLE_TASK.md` remains untouched. Branch `codex/studio-startup`; [PR11](https://github.com/2ve2/FolioCraft/pull/11) targets main and remains unmerged. Source commits: `9f2f92f fix(build): update compatible security releases`; `c69cd20 feat(studio): show frame during safe startup`. The separate evidence commit follows its completed full gate rerun.

Source `c69cd20` additionally passed GitHub validate, workers, integration and e2e jobs in [run39836222837](https://github.com/2ve2/FolioCraft/actions/runs/39836222837). This is observed remote success for that source commit, not a prediction for the subsequent documentation head.540 tracked non-Markdown files match the independently installed source-only gate copy byte-for-byte; zero mismatches. Changed Markdown contains no Arabic characters.

Cleanup actually verified:0 users remain in the owned local database; owned PostgreSQL stopped;4300/4301/4400/55436 are closed. No reset/drop was used. All task logs, raw measurements and temporary build/runtime material remain ignored under project-owned work/. Active source work:none. Local blockers:none. Next action: human review of PR11 and its current checks, then the manual rollout above. No merge or deployment was performed.
