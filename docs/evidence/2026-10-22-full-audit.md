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

Four read-only reviewers covered owner/public API surfaces, administration and authentication, runtime and data integrity, and the web app. Findings were verified before fixing. See the section below for the outcome of each.

## Gates

Recorded at the end of the work in the final section below.

## Known limits

- Visual checks use Chromium only; Safari/Firefox, physical devices and real screen readers were not tested.
- Nothing here was verified on the hosted trial.
