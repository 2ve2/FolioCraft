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

## Accepted exceptions (not changed)

- **The landing page's interactive example portfolio** is a scaled preview (D18). Its miniature links are under 24 px, and "Expand preview" opens it at full size.
- **18 px checkboxes inside their labels.** The whole label is the target.
- **English words on Arabic pages** come from content, not interface text: the fictional portfolio content (an English site); third-party service names on the privacy page; and the spam honeypot field's label, which is hidden from view and from assistive technology.
- **The missing-portfolio page under `/p/`** is in English for an unknown site, because no site language exists to choose from.

## Second pass (after fixes)

In progress: the rerun of the crawl, contrast check, API probe and Playwright e2e is recorded here when it completes.

## Not verified

- Hosted trial behaviour, real email delivery, Safari and Firefox, physical devices and screen readers (axe and landmark checks are automated only).
