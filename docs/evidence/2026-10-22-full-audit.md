# Full project audit and cleanup — 2026-10-22

Request: after Task 8 the human asked for everything to be checked and cleaned, with fonts, sizes, layouts, visual identity and logos made fully consistent ("professional work, literally"). The human later authorized helper agents for this audit and left the remaining accent-color choice to the agent. Branch `claude/modest-davinci-osg31w` from `main` `efe830c`. Nothing was deployed; no hosted system, secret or provider was accessed.

Environment: Bun 1.4.2; local PostgreSQL 16 `folio_test`; local production build (`next build` + `next start`) with the Bun API; Chromium 1194 through Playwright. QA scripts live in ignored `work/qa` (`visual-audit.mjs`, `type-roles.mjs`, `align.mjs`, `option-shots.mjs`).

## A. Unused code, files and assets

- Tool: `bunx knip@5` (analysis only, not added to the project), then manual tracing of every candidate. Scripts and fixtures that knip flags are run as subprocesses by the test harnesses or documented runbooks and were kept. The public brand kit (`apps/web/public/brand/ichnara`, including the ZIP) is a deliberate, human-approved download and was kept.
- Removed: `admin-panel.tsx` and `admin-overview.tsx` (never mounted; `/admin` renders `AdminDashboard`), the site/account/audit list components, 34 admin copy keys in both languages, 13 unused `admin.module.css` classes and their 8 color tokens, `nativeError`, `reasonSchema` and the unused `services/sites/index.ts` facade. `admin-lists.tsx` became `admin-pagination.tsx`. Legacy text-logo CSS (from before the SVG logo) and its three tokens were also removed. About 1,100 lines in total.
- The permissions test that rendered the dead overview now keeps its policy and copy-parity assertions; the real overview's permission scoping stays covered by the API admin-operations integration test.

## B. Documentation

- STATUS is again a short continuation page; previous sections are prepended unchanged to `archive/STATUS-ARCHIVE.md`. README is a current index; the original handoff README is archived unchanged.
- CHANGELOG keeps newest-first entries from 2026-10-20; the older chronological part (215 KB) moved unchanged to `archive/`.
- Superseded one-off reports moved to `archive/` (handoff notes, route audit, media diagnosis, prototype review, legacy-hostname inventory, SMTP diagnosis, admin evidence canvas, earlier editorial brand study). `docs/brand/review-round-2` stays because `scripts/build-brand-kit.py` reads it. A link check over all Markdown finds 0 broken relative links.

## C. Visual identity

Method: `visual-audit.mjs` captures every platform page (landing, sign-in, sign-up, password recovery, reset, verification, privacy, terms, content policy, 404, the four studio sections, onboarding, admin gate and a published portfolio) in Arabic and English at 390, 768 and 1440 px: 102 full-page screenshots, each with computed-style measurements. `type-roles.mjs` records font size, weight, height and radius per UI role on every page.

| Check | Before | After |
| --- | --- | --- |
| Text in a non-project font (system monospace, Segoe UI) | 52 elements | 0 |
| Text under 13 px | 6 | 0 |
| Page title (h1) | 24, 30 or 36 px at weight 400 or 700 | 30 px / 700 everywhere (26 px phones); landing hero 60 px / 750 |
| Section headings (h2) | weight 400 or 650 | 650 |
| Form labels | 13 px (sign-in) vs 15 px (studio) | 15 px |
| Inputs | 14 or 15 px; 8, 10 or 11 px corners | 15 px; 10 px corners; 48 px tall |
| Buttons | 13–15 px; 9 or 10 px corners | 15 px / 650; 10 px corners; at least 44 px |
| Text actions | 32 px tall | 44 px (touch minimum) |
| Page panels | 12, 18 or 21 px corners | 20 px (cards 12 px) |
| Primary color | admin and 404 used pre-approval violet; a 404 button changed hue on hover | approved indigo #3f46c8, hover #3036a6 |
| Secondary accents | 27 violet tokens | same lightness and saturation in the brand hue; focus ring 5.0:1 on white |
| Header vs footer logo edge (1440 px) | 86 vs 166 px from the edge; different on legal/404 | identical on every page at 390/768/1440/1920 |
| Horizontal overflow, page errors, broken images | 0 | 0 |

Also fixed: the sign-in form showed the password rules and enforced a 10-character minimum in the browser, which could block an older account with a shorter password; rules now appear only on sign-up.

Comparisons: [sign-in 1440](../screenshots/audit-login-ar-1440.png), [sign-in 390](../screenshots/audit-login-ar-390.png), [studio appearance](../screenshots/audit-studio-appearance-ar-1440.png), [404](../screenshots/audit-404-en-1440.png). The current rules are recorded in [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md).

## D. Correctness and security review

Four read-only reviewers covered owner/public API surfaces, administration and authentication, runtime and data integrity, and the web app. They found no IDOR, no draft leak to public output, no XSS or open redirect and no permission-matrix gap. Reported findings, each to be verified before fixing (file:line approximate). Status as of the last update; any item without **Fixed** is still open:

API — administration and authentication
1. Medium: `POST /api/auth/verify-password` appears reachable over HTTP and is outside the `passwordFailures` budget, so a stolen staff session could guess the password at the generic rate (`lib/auth/index.ts`, `lib/auth/hooks.ts`, `middleware/admin.ts`). Also `/change-password` and `/two-factor/enable|disable` act as slower password oracles. **Fixed** (`0bcdf00`, HTTP returns 404). Follow-up 2026-10-23 (`28494d2`): wrong current passwords on change-password, delete-user and the password-checked two-factor endpoints now count against the account's shared failure budget, independent of IP.
2. Low: password-verified sensitive actions that fail later write an extra `permission_denied` audit row (`services/admin/request-service.ts`, `notice-service.ts`, `user-service.ts`). **Fixed** (`a26d8ef`).
3. Low: signed-in non-staff users can write unbounded `permission_denied` rows (`services/admin/sensitive-action.ts`, `middleware/admin.ts`). **Fixed** (`a26d8ef`).
4. Low (decision): the email mask shows the first character and the full domain. Open: a product decision (masking the domain hides more but makes support harder).
5. Docs: `docs/API.md` says data-request exports exclude drafts; schemaVersion 2 includes them. **Fixed** (`9a26d50`).

API — runtime and data
6. Medium: cache-invalidation retry has no backoff; a missing revalidation secret is treated as a failure, not as disabled (`services/cache-invalidation.ts`). **Fixed** (`3347492`). Note: in the default `wrangler.toml` the revalidation binding is commented out, so delivery is a no-op unless the cache is enabled.
7. Medium: `cache_invalidation_failed` events are dropped by the monitoring allowlist (`packages/monitoring/src/index.ts`). **Fixed** (`7a43869`).
8. Low-medium: a failing post-response cache flush turns a committed mutation into a 5xx (`app.ts`). **Fixed** (`7a43869`).
9. Low: the daily backstop delivers at most 20 pending invalidations (`worker.ts`). **Fixed** (`7a43869`).

API — owner and public surfaces
10. Medium: one IP can exhaust a site's hourly inquiry budget in 12 minutes (`routes/public/inquiries.ts`). **Fixed** (`57c0688`).
11. Medium: one actor can exhaust a site's report budget; IPv6 is not bucketed by /64; 429 lacks Retry-After (`services/reports.ts`). **Fixed** (`09dbc89`; the site-wide cap stays as flood protection).
12. Low-medium: upload completion holds the site lock during provider IO (`services/assets.ts` `complete`). **Fixed** 2026-10-23 (`c9817cb`): two short transactions around the copy; a deletion during the copy removes the late copy and returns 409 (integration test).
13. Low: staging copies of completed uploads are never deleted (`services/assets.ts`, `services/maintenance.ts`). **Fixed** (`d6d668f`).
14. Low: a project's custom slug cannot be removed once set (`draft-service.ts`, `content-service.ts`, contracts). Open: no studio control sets or removes a project slug today; only the API or an imported draft can, so this waits for that feature.

Web
15. Medium: an upload that finishes during publish or a language switch is dropped while the picker reports success (`use-studio-controller.ts` `update`, `asset-picker.tsx`). **Fixed** (`df3be7d`).
16. Low: the studio language switch silently does nothing while busy. **Fixed** (`df3be7d`).
17. Low: on a 404 inside a portfolio the language switch does nothing. **Fixed** (`288dafd`).
18. Low: draft export revokes the download URL immediately (WebKit may cancel it). **Fixed** (`df3be7d`).
19. Low: the asset preview shows "unavailable" while its private URL is still loading. **Fixed** (`af56370`).
20. Low: some user-content inputs lack `dir="auto"` (profile and project fields). **Fixed** (`b727ba7`).
21. Low: static assets served directly by Workers Static Assets do not receive `nosniff`/CSP headers (no `public/_headers`). **Fixed** (`782e662`).

## Gates

Final run on the last commit of this audit (local, `folio_test`): `bun audit` no vulnerabilities; typecheck exit 0; Biome clean; web 58/58; guarded API 93 pass / 12 conditional skips / 0 fail; Playwright 54/54; OpenNext build exit 0 (the `_headers` file is copied into `.open-next/assets`). Each fix commit lists its own checks.

## Known limits

- Visual checks use Chromium only; Safari/Firefox, physical devices and real screen readers were not tested.
- Nothing here was verified on the hosted trial.
