# 2026-10-23 — Full audit: styles, UI/UX, APIs and tests

Request: "are you sure everything is fine? Do a comprehensive analysis of the styles, UI/UX and everything, check the state of the APIs and run tests" ("هل انت متاكد كل شي تمام؟ سوي تحليل شامل للستايلات و ui ux وكل شي وشوف وضع ال apis وسوي تستات").

- Branch `claude/modest-davinci-osg31w`, started from `main` at `62e9058` (PR #16 merged).
- Everything ran locally with fictional accounts against a local PostgreSQL 16 database and a local production build (`next build` plus `next start`, with the API on Bun).
- Nothing was deployed. No hosted system, provider or secret was used.

## Method

1. **Baseline.** Every suite was run on `main` before any change.
2. **API probe.** A 120-check black-box script (`work/audit-tools/api-probe.mjs`) covers:
   - every private and administration route without a session;
   - every site route with another member's session (A's site is compared before and after);
   - every administration route with a member session;
   - the error contract: malformed JSON, unknown fields, an invalid slug, an oversized body, an unknown route, a malformed id;
   - CORS for a foreign origin and a cross-site POST;
   - security headers on the API and the web;
   - public exposure of unknown and suspended sites, and owner data in the public payload;
   - readiness and latency.
3. **UI crawl.** `work/audit-tools/crawl.mjs` covers 30 routes × Arabic/English × 1440/768/390 px, 180 views:
   - the landing page, sign-in, sign-up and recovery pages, the legal pages, the 404 page, a published portfolio and a missing one;
   - onboarding, every studio section, every console page and a site detail.
   - Each view is checked for horizontal overflow, targets under 24 px on phones, `lang`/`dir`, page errors, HTTP 5xx and console errors, plus axe-core 4.11 (WCAG 2.0/2.1/2.2 A and AA plus best practice) at 1440 px. Each view gets a full-page screenshot, and the screenshots were reviewed by eye.
4. **Style review.** Every class selector in the global stylesheets and CSS modules was searched against the components (word-boundary match, dynamic prefixes such as `accent-*`, `state-*` and `swatch-*` resolved). Every colour token was checked for references. axe contrast failures were measured to the exact colour pair.

## Baseline on `main` (before changes)

| Check | Result |
|---|---|
| `bun audit` | No vulnerabilities (541 packages) |
| Typecheck (API, web, e2e) | exit 0 |
| Biome | 482 files, clean |
| Web unit tests | 60 pass / 0 fail |
| Workers storage / mail | 8/8, 15/15 |
| API suite (guarded local database) | 103 pass / 12 skip / 0 fail |
| Playwright e2e | 56 passed |

## API probe — first pass

119 of 120 checks passed:
- Anonymous calls get 401 on every private route.
- Another member gets a 4xx on every route of A's site, and A's site is unchanged.
- Members get 403 on all administration routes.
- Malformed JSON gives 400 with a code. An invalid slug and an oversized body are refused. An unknown route gives a 404 with the contract. A malformed id gives a 4xx, not a 500.
- No CORS grant goes to a foreign origin, and the cross-site POST is refused.
- `nosniff`, `Referrer-Policy` and `X-Frame-Options` are set on the API. CSP (with `frame-ancestors`), `Permissions-Policy` and the rest are set on the web.
- Unknown and suspended sites return 404 publicly, and the public payload carries no owner id or email.
- Readiness reports the database.
- Latency: median 4 ms, p95 9 ms (local).

**Finding:** `POST /api/sites` with an extra `owner` field returned 200. The field was ignored, but other bodies are strict.

## UI crawl — first pass

67 of 180 views reported something. No view had horizontal overflow, page errors or 5xx responses.

- **Contrast** (34 views): seven secondary text colours were between 3.0:1 and 4.4:1:
  - studio labels, nav items, breadcrumbs and section eyebrows;
  - the save confirmation;
  - the signup privacy note;
  - console nav group labels.
- **Landmarks**:
  - The studio (every section) and the published portfolio had no `main` region (`landmark-one-main`, `region`).
  - The legal tab navigation had the same Arabic name as the footer's legal links (`landmark-unique`).
- **Targets on phones**: project links (visit, details, view project) were 21 px tall, the console back link 22 px.
- **429 responses** (23 views): after about 120 views, session reads from the crawl's single address returned 429. As a result the Studio, the console and onboarding showed "We couldn't check your sign-in status". See the rate-limit finding below.
- **Raw keys in the console**: the overview, the activity log and the staff matrix showed `report.handle`, `site.suspend`, `audit.export` and similar keys, also in Arabic. The target-type filter listed raw values.
- **Screenshot review** found:
  - The loading/error screen's wordmark. In English only the clipped bottom edge of oversized letters showed under the illustration; in Arabic nothing was drawn.
  - The error title's alert icon floating at the screen edge when the title wraps.
  - Five full-width metric cards stacked on the phone overview.
  - The studio inbox pager showing disabled buttons around a lone "0" for empty lists.

## Root causes and fixes (one commit each)

1. **Strict request bodies** (`packages/contracts`, `routes/sites/assets.ts`). Site creation, draft save, publish and upload intent now reject unknown fields with 400. New contract test.
2. **Session reads behind shared addresses** (`lib/auth/index.ts`).
   - Better Auth 1.7.7 keeps a database bucket per address and path, and resets it only after a full idle window: every allowed request moves `lastRequest` forward. Continuous traffic from one address (a campus, an office, carrier NAT) therefore reaches the 100-per-minute global rule on `/get-session`. After that every visitor behind it gets 429 and a failed Studio load, until a full minute passes with no request.
   - Each page load makes exactly one session read (measured: landing, sign-in, studio, console pages), so the UI does not over-fetch.
   - `/get-session` is now exempt. It only echoes the caller's own cookie, and private reads are unthrottled elsewhere too. Sign-in, sign-up, recovery, change-password, change-email, two-factor and every other auth path keep their limits.
   - New integration test: 110 session reads from one address succeed, while `/ok` still returns 429 on the 101st call. Without the exemption the test fails with 429.
3. **Dead CSS.** Removed selectors for markup that no longer exists (`loading-card`, `locale-select`, `sidebar-label`, `standalone-admin`, `welcome-footer`, `address-display` and others), three unused module classes and 20 unreferenced colour tokens. About 100 lines in total, with no rendered rule changed.
4. **Contrast.** Each failing colour keeps its hue and is darkened just past 4.6:1. The published-page badge and the report button use the shared accent tokens.
5. **Landmarks.**
   - The studio work area and its loading frame are `main`.
   - The published shell is the page's `main`. The shared portfolio markup stays landmark-neutral so the studio preview can embed it inside the studio's own `main`.
   - The legal tabs are named "Legal document navigation" / "التنقل بين الوثائق القانونية".
6. **Targets.** Portfolio arrow links, the detail back link and the console back link have a 24 px minimum height. Their appearance is otherwise unchanged.
7. **Readable console names.**
   - The unused label map with stale keys (`auth.ban-user`) is replaced by Arabic and English names for every permission, recorded action and target type.
   - The activity filter is a list of recorded actions instead of free text.
   - Raw keys stay as secondary text in event details and the permission matrix.
   - A test requires both names for every key.
8. **Loading and error screens.** The wordmark draws the localized word with its measured bounds, since both v2 lockups list the emblem first and the word second. The alert icon is inline with the title. A new test checks the signature draws the word of each language.
9. **Phone overview.** Two metric cards per row at ≤760 px.
10. **Studio pager.** It is hidden when there is only one page. New test.
11. **Second-pass contrast.** Five more colour pairs were darkened, with the same hues.

## Accepted exceptions (not changed)

- **The landing page's interactive example portfolio** is a scaled preview (D18). Its miniature links are under 24 px, and "Expand preview" opens it at full size.
- **18 px checkboxes inside their labels.** The whole label is the target.
- **English words on Arabic pages** come from content, not interface text: the fictional portfolio content (an English site); third-party service names on the privacy page; and the spam honeypot field's label, which is hidden from view and from assistive technology.
- **The missing-portfolio page under `/p/`** is in English for an unknown site, because no site language exists to choose from.

## Second pass (after fixes)

- **Crawl** (180 views, build with fixes 1–6): 28 views noted, down from 67.
  - No 429s, landmark findings, overflow or page errors.
  - What remains: the expected 404 responses on the two not-found routes (12 views), the accepted targets below (8 views), and five more contrast pairs that the earlier failures had hidden:
    - muted text on the studio preview panel, 4.37:1;
    - the inactive device switch, 2.48:1;
    - the preview link, 4.43:1;
    - the `/p/` address prefix, 3.18:1;
    - the console danger button, 4.38:1.
  - Those five were darkened to 4.6–4.7:1 (fix 11). The axe contrast and landmark rerun on sign-in, the studio (content and settings), the console overview, a console site page and the Arabic terms page reports no violations.
- **API probe**: 120 of 120 passed. Unknown fields now return 400. Median 3 ms, p95 7 ms (local).
- **Loading/error screen**: the wordmark is drawn in full in both languages, and the alert icon sits beside the title. Screenshot: [audit-error-screen.png](../screenshots/audit-error-screen.png).
- **Suites on the final head**:

  | Check | Result |
  |---|---|
  | Typecheck | exit 0 |
  | Biome | 483 files, clean |
  | Web unit tests | 63 pass / 0 fail |
  | API suite | 105 pass / 12 skip / 0 fail |
  | Workers storage / mail | 8/8, 15/15 |
  | `bun audit` | no vulnerabilities |
  | Playwright e2e | 56 passed (2.7 min) |

## Administration console deep pass

The human then asked to apply this to the dashboard ("يب طبق هذا على الداش بورد").

### Method

The API suite already runs every role against every mounted administration endpoint, and that passed (above). This pass covered what the console shows each role and how it behaves.

- **Role tour** (`work/audit-tools/console-tour.mjs`). Fictional local owner, moderator, support and analyst accounts, × Arabic/English × 1440/390 px × 13 console pages, 208 views.
  - Each view records the visible navigation, any administration read the server refused, console errors, horizontal overflow, raw keys in the main region, and axe-core findings at 1440 px.
- **Keyboard and dialogs** (`console-keyboard.mjs`), 164 checks:
  - The skip link is the first Tab stop and moves focus into the main region.
  - Every dialog opened from the notices, site, report, account, activity, data-request and security pages: focus moves in; the dialog has a name; 35 Tab/Shift+Tab presses stay inside; every field has a label; Escape closes it; focus returns to the opener.
  - The phone menu opens with focus inside, and Escape closes it and returns focus to the menu button.
- **States** (`console-states.mjs`), 12 checks. Each check simulates a failure in the browser only:
  - a failed list read shows an alert with a retry that then loads the rows;
  - a search with no match shows an empty state;
  - a slow read shows loading rather than "no results";
  - a failed permission read offers a retry.

### Findings and fixes

12. **Focus lost after the suspend dialog.** Closing it, from a site page or from a report's "take action", left focus on the page body. Its opener is disabled while the site loads, so the browser drops focus before the dialog can record it. The opener is now remembered when pressed and refocused after closing. The rerun passed 164 of 164.
13. **Empty "unavailable" panel.** Support staff saw a site-history panel whose only content was "Unavailable with your permissions". It now appears only with `audit.read`.
14. **Generic role label.** Every staff member was labelled "Administrator" in the sidebar. It now names the role (Owner, Moderator, Support, Analyst, with Arabic names in Arabic).
15. **Misleading outage message.** When the permission read failed (for example a 503), the gate told an owner "This account does not have permission to manage the platform". It now says the server could not be reached and that nothing about the account changed, next to the retry button.

### Result on the final build

- Role tour: 208 views, 0 with refused reads, console errors, axe findings, overflow or unexpected raw keys. The staff matrix shows each permission's key as secondary text under its readable name, by design.
- Each role's navigation matches its grants:
  - owner: all nine pages;
  - moderator: overview, accounts, sites, reports, notices, activity log;
  - support: overview, accounts, sites, reports, data requests, notices;
  - analyst: overview, accounts, sites, reports, notices, activity log, system.
- Keyboard: 164 of 164. States: 12 of 12.
- Screenshot board: [audit-console-roles.png](../screenshots/audit-console-roles.png). It shows the phone overview with two metrics per row, the readable activity log, the staff page with role names, and a support user's site page without the empty panel.

## Not verified

- Hosted trial behaviour, real email delivery, Safari and Firefox, physical devices and screen readers (axe and landmark checks are automated only).
