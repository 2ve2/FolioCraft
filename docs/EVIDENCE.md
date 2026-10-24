# Evidence

Dated evidence for each completed step, newest day first: what was asked, what changed, which checks actually ran and their results, and what was not verified. Screenshots and raw measurement files that earlier entries mention were removed in the 2026-10-24 cleanup and remain in Git history.

## 2026-10-24 — Sign-up feedback, phone notice, badge centring and cleanup

Requests from the human, verified against the code before changing it. Nothing was deployed.

### Findings and causes
- **Address field line.** `.slug-input` clips its children (`overflow: hidden`), so the inner input's 2px focus outline survived only as a line beside the `/p/` prefix.
- **Silent sign-up.** After an accepted sign-up the form stayed filled, with a small grey sentence and a "resend verification" link; nothing reacted while typing.
- **Same email twice.** With email verification required, Better Auth 1.7.7 answers a registered address exactly like a new one (`shouldReturnGenericDuplicateResponse`), so accounts cannot be enumerated. This is intended; the gap was that nobody was told.
- **Badge.** The badge drew the emblem in a `0 0 235 240` view box while the emblem spans x 0–208, about 6% left of centre.

### Changes
- **Address field.** The frame takes the focus border and ring, and the inner input draws none.
- **Sign-up fields** (`signup-fields.tsx`).
  - The email shape is confirmed or explained after the field is left.
  - The password shows a live count ("٣ من ١٠ أحرف") that turns green at 10, with a show/hide toggle that stays at the right edge in both languages.
  - Empty fields are flagged only after leaving them with text, or after a refused submit. The native constraints remain.
- **Check-your-email step** (`signup-sent.tsx`). It replaces the form and names the address. It offers sign-in, a resend after 60 seconds (native endpoint) and a way back. The wording also covers an existing account.
- **Duplicate notice.** `onExistingUserSignUp` sends the new bilingual `existing-account` email with a web sign-in link, at most once per account per hour. Failures are logged and swallowed, so the response never differs.
- **Phone notice** (`large-screen-notice.tsx`). Shown at 760px or narrower in the studio and console only, once per browser, and announced as a modal dialog.
- **Badge.** The view box is `0 2 208 236`; the measured centre offset is 0.01px.

### Checks
- **API: 109 pass / 12 skip / 0 fail.** New tests:
  - the notice is sent once an hour, in Arabic for an Arabic callback, with failures silent;
  - the template renders in both languages.
- **Web: 69/0.** New tests: initial field guidance, native rules and the toggle; the sent step and its cool-down.
- **Browser, local production build.**
  - Live hints in both languages, the toggle, and the sent step replacing the form with focus on its heading.
  - The address focus ring sits on the frame only.
  - The phone notice appears in the studio (AR) and console (EN), not on desktop or public pages.
- **Playwright e2e: 56 passed.** The phone navigation journey now dismisses the notice and checks it stays dismissed after a reload.

### Cleanup
- **Removed:** `docs/screenshots` (35 images, 4.3 MB), `docs/archive`, `docs/brand/review-round-2`, `docs/brand/v1.3`, `docs/brand/VERIFICATION.md`, `docs/sql`, `docs/AGENTS.md` and two raw measurement sidecars.
- **Merged:** 19 evidence files into this file, and the backend style notes into ARCHITECTURE.md.
- **Result:** `docs` holds 26 files instead of about 150, and the relative link check finds 0 broken links. Brand scripts read only `docs/brand/v2`, which stays.

### Not verified
- Real email delivery of the existing-account notice; the hosted trial.

## Logo, phone navigation, one-command release and two hardening fixes — 2026-10-23

Request (2026-10-23, before the human went to sleep): review the logo's weight and whether the black logo suits the platform; on narrow screens replace the sidebar's top buttons with a menu button that opens a sidebar, in the studio and the dashboard; propose and carry out further tasks; keep working through interruptions. The human delegated the decisions ("سوي يلي تبيه"). Branch `claude/modest-davinci-osg31w` from `main` `a5d11c5`. Nothing was deployed; no hosted system, secret or provider was accessed.

Environment: Bun 1.4.2; local PostgreSQL 16 `folio_test`; local production build (`next build` + `next start`) with the Bun API; Chromium 1194 through Playwright. QA scripts in ignored `work/qa` (`logo-shots.mjs`, `logo-board.mjs`, `drawer-shots.mjs`) and `work/logo`.

### 1. Logo v1.3

Measured on the shipped artwork before the change:

| | Latin lockup | Arabic lockup |
| --- | --- | --- |
| Tallest letter in the header | 31.5 px | 22.7 px |
| Stroke relative to letter height | 88 / 600 units | 140 / 732 units (Noto Sans Arabic 700) |
| Colour | all ink | all ink |

Options compared at header and display sizes: logo-v1.3-options.png (current; indigo emblem; Arabic 600 and 550; Arabic sized to the emblem at 600 and 700). Chosen: indigo emblem with ink word, Arabic Noto Sans Arabic 600 sized so its tallest letter spans the emblem like the Latin capital (both 31.5 px in the header), descender space trimmed so both languages keep the same header height. White single-colour lockup on the dark footer (the accent is 2.27:1 on ink).

- Pipeline check: `docs/brand/v1.3/generate.py` at weight 700 reproduces the previous Arabic outlines exactly (first path `M80 0 59 732H199L220 0Z`), then generates 600.
- Kit v1.3 regenerated with the existing scripts; `ichnara-logo-duo.svg` and `ichnara-logo-ar-duo.svg` added; v1, v1.1 and v1.2 archive URLs redirect to v1.3. ZIP CRC passed.

### 2. Phone navigation drawer

Below 970px the studio and administration sidebars become a top bar (logo and menu button). The button opens the same navigation, account and sign-out as a drawer from the reading-start edge, with backdrop, close button, Escape, focus kept inside and returned to the button. The admin overview counters became label/value rows (long labels broke through the numbers on phones).

- Screenshots, closed and open at 390 px: studio, Arabic, administration, English.
- Local QA at 390/768/1440 px in both languages for studio and admin (owner role set on local fixture accounts in `folio_test` only): menu button present at 390 and 768, absent at 1440; horizontal overflow 0; page errors 0.
- New browser journey `e2e/navigation.spec.ts` (Arabic and English): closed state, drawer edge and width, section choice closes and returns focus, Tab stays inside, Escape and close button, desktop width restores the sidebar. The administration drawer is not in the committed suite because e2e enforces MFA for staff; it was checked in local QA.

### 3. One-command release

`bun run deploy:trial` (`scripts/deploy-trial.ts`): branch/clean/up-to-date checks, frozen install, web build with the trial origins, API then web deploy, `/health` and `/en` checks. `--cache` / `--normal` select and remember the manifests; `--dry-run` uploads nothing. Checks: the script refuses to run off `main` (exit 1 with the instruction); web build exit 0; dry-run bundles of all four manifests exit 0, including the cache web manifest with `--var PORTFOLIO_CACHE_ENABLED:true`. Not run against Cloudflare.

### 4. Hardening (audit findings 1 and 12)

- Wrong current passwords on change-password, delete-user and the password-checked two-factor endpoints count against the account's shared failure budget (5 per 15 minutes, then 15 minutes blocked; the budget administrative password checks already used), independent of IP. Test: five wrong attempts from five addresses, then the correct password is refused with 429 `PASSWORD_ATTEMPTS_BLOCKED` on change-password and two-factor enable; another account is unaffected.
- Upload completion validates in one short transaction, verifies and copies without locks, and marks the asset ready in a second transaction. Test: the owner deletes the upload during the copy (a request that needs the site lock, so it would wait under the old code); completion answers 409 and the late copy is removed.

### Gates

Typecheck exit 0; Biome clean; web 58/58; guarded API 95 pass / 12 conditional skips / 0 fail; Playwright 56/56 (2.7 min). An intermediate API run hit the sign-up limit because two runs were started within one minute; clearing the local `rate_limit` rows and rerunning passed. An intermediate Playwright run failed on two points that were fixed: the drawer position was read mid-animation, and the extra sign-ins pushed another journey over the 10-per-minute limit (API sign-in in e2e now waits out the limit and extends that test's budget by the same time).

### Known limits

- Logo choice is a design judgement under delegation, not a user study.
- Chromium only; no physical devices or screen readers.

## 2026-10-23 — Full audit: styles, UI/UX, APIs and tests

Request: "are you sure everything is fine? Do a comprehensive analysis of the styles, UI/UX and everything, check the state of the APIs and run tests" ("هل انت متاكد كل شي تمام؟ سوي تحليل شامل للستايلات و ui ux وكل شي وشوف وضع ال apis وسوي تستات").

- Branch `claude/modest-davinci-osg31w`, started from `main` at `62e9058` (PR #16 merged).
- Everything ran locally with fictional accounts against a local PostgreSQL 16 database and a local production build (`next build` plus `next start`, with the API on Bun).
- Nothing was deployed. No hosted system, provider or secret was used.

### Method

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

### Baseline on `main` (before changes)

| Check | Result |
|---|---|
| `bun audit` | No vulnerabilities (541 packages) |
| Typecheck (API, web, e2e) | exit 0 |
| Biome | 482 files, clean |
| Web unit tests | 60 pass / 0 fail |
| Workers storage / mail | 8/8, 15/15 |
| API suite (guarded local database) | 103 pass / 12 skip / 0 fail |
| Playwright e2e | 56 passed |

### API probe — first pass

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

### UI crawl — first pass

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

### Root causes and fixes (one commit each)

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

### Accepted exceptions (not changed)

- **The landing page's interactive example portfolio** is a scaled preview (D18). Its miniature links are under 24 px, and "Expand preview" opens it at full size.
- **18 px checkboxes inside their labels.** The whole label is the target.
- **English words on Arabic pages** come from content, not interface text: the fictional portfolio content (an English site); third-party service names on the privacy page; and the spam honeypot field's label, which is hidden from view and from assistive technology.
- **The missing-portfolio page under `/p/`** is in English for an unknown site, because no site language exists to choose from.

### Second pass (after fixes)

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
- **Loading/error screen**: the wordmark is drawn in full in both languages, and the alert icon sits beside the title. Screenshot: audit-error-screen.png.
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

### Administration console deep pass

The human then asked to apply this to the dashboard ("يب طبق هذا على الداش بورد").

#### Method

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

#### Findings and fixes

12. **Focus lost after the suspend dialog.** Closing it, from a site page or from a report's "take action", left focus on the page body. Its opener is disabled while the site loads, so the browser drops focus before the dialog can record it. The opener is now remembered when pressed and refocused after closing. The rerun passed 164 of 164.
13. **Empty "unavailable" panel.** Support staff saw a site-history panel whose only content was "Unavailable with your permissions". It now appears only with `audit.read`.
14. **Generic role label.** Every staff member was labelled "Administrator" in the sidebar. It now names the role (Owner, Moderator, Support, Analyst, with Arabic names in Arabic).
15. **Misleading outage message.** When the permission read failed (for example a 503), the gate told an owner "This account does not have permission to manage the platform". It now says the server could not be reached and that nothing about the account changed, next to the retry button.

#### Result on the final build

- Role tour: 208 views, 0 with refused reads, console errors, axe findings, overflow or unexpected raw keys. The staff matrix shows each permission's key as secondary text under its readable name, by design.
- Each role's navigation matches its grants:
  - owner: all nine pages;
  - moderator: overview, accounts, sites, reports, notices, activity log;
  - support: overview, accounts, sites, reports, data requests, notices;
  - analyst: overview, accounts, sites, reports, notices, activity log, system.
- Keyboard: 164 of 164. States: 12 of 12.
- Screenshot board: audit-console-roles.png. It shows the phone overview with two metrics per row, the readable activity log, the staff page with role names, and a support user's site page without the empty panel.

### Not verified

- Hosted trial behaviour, real email delivery, Safari and Firefox, physical devices and screen readers (axe and landmark checks are automated only).

## 2026-10-23 — External review reports: verification and fixes

The human shared two Arabic review reports of the trial (https://lord2ve.tech) and asked for an opinion ("ايش رايك بهذا الكلام؟"):
- **Journey review:** a signed-in walkthrough with a fictional account, in Chrome at desktop width.
- **Visitor review:** a public, signed-out pass, in Chrome desktop and mobile emulation.

Each finding was checked against the code before anything changed. Nothing was deployed.

### Findings

| # | Finding | Verdict | Change |
|---|---|---|---|
| J1 | A short password at sign-up shows a generic error | **Partly confirmed.** The field already has `minlength=10` (since 2026-10-22), so a real user gets the browser's message. The reviewer's automation set the value directly, which skips that check. The server's `PASSWORD_TOO_SHORT` was then mapped to the generic failure. | Password-length and invalid-email codes get their own message in both languages. |
| J2 | Repeated field path in the save banner | **Confirmed.** One field failing two rules was listed twice. | Paths are de-duplicated. |
| J3 | Arabic `؛` in the English banner | **Confirmed.** The list always used the Arabic separator. | `; ` in English, `؛ ` in Arabic. |
| J4 | The verification success page is unclear | **Confirmed.** `?verified=1` showed the resend form with advice to request a new link. Better Auth returns there without `error` only after a successful (or earlier) verification. | Heading "Your email is verified", a short note and a Sign in button. A link that fails keeps the alert and the form. |
| J5 | "Incomplete upload" during the upload | **Confirmed.** The pending card showed "Incomplete upload" and a retry button while the transfer and verification were still running. | The card shows "Uploading and verifying…" without retry until the attempt ends. |
| J6 | Links without `https://` are rejected without a hint | **Confirmed.** | Link fields add `https://` on blur when the value looks like a web address. |
| J7 | Duplicate form elements in the studio DOM | **Not a defect.** The live preview includes the portfolio's own contact form (disabled, preview only), so automation sees a second set of fields. | None. |
| V1 | Landing example links return 404 when opened directly | **Confirmed.** `/p/illustrative-example/...` is not a published site; in-page clicks worked only because they are intercepted. | The preview accepts a base path; the landing uses its `#example` section, so links resolve to the home page. |
| V2 | `www.lord2ve.tech` has no DNS record | **Outside the code.** It is a Cloudflare DNS setting. | Human action: add the `www` record with a redirect to the apex. |

### Follow-up: the 404 page

- **Request.** The human felt the 404 text looked broken ("احسه خربان").
- **Cause.** The "404" numeral used IBM Plex Mono, whose zero has a centre dot. At -10px tracking the numeral read as "4•4", and the decorative card covered the last digit. The English heading ("This page is out of the picture.") was an idiom, under an all-caps eyebrow.
- **Change.**
  - The numeral uses the interface face with plain figures and -2px tracking, and the card sits beside it.
  - The copy is now "Error 404" / "We can't find this page" and "خطأ 404" / "لم نعثر على هذه الصفحة", with plainer guidance.
- **Checked.** Screenshots in both languages at 1440 and 390 px. Playwright e2e 56 passed with the updated routing assertion.

### Follow-up: the loading/error screen

- **Request.** The human had meant the "We couldn't complete the request" screen, not the 404 page.
- **Problems.**
  - A large wordmark competed with the heading.
  - The generic heading was repeated by a message with jargon ("sign-in status").
  - The Arabic button said "reload" while the English one said "Try again".
  - The unverified-email state also used the error heading.
- **Change.**
  - The wordmark is hidden on errors; the illustration keeps the emblem.
  - Callers pass a heading: "We can't reach Ichnara right now" (session check), "Your workspace didn't load" and "Confirm your email", with Arabic equivalents.
  - The Arabic retry button reads "حاول مجدداً".
- **Checked.** A new unit test (web 67/0), screenshots at 390 px in both languages and Playwright e2e 56 passed.

### Follow-up: simpler 404 and error headings

- **Request.** The human asked to remove three things from the 404 page: the ring around the numeral, the paper card and the small "Error 404" line. They also asked to remove or relocate the icon beside the error-screen heading; the decision was delegated.
- **Change.**
  - The 404 page keeps the numeral (now readable text, so 404 is still announced), the heading, the message and the actions.
  - The error heading has no icon. It names the problem, and the message remains a live alert.
  - The unused styles and colour tokens were removed.
- **Checked.** Screenshots in both languages; web 67/0; typecheck 0; Biome clean; Playwright e2e 56 passed.

### Retest report (2026-10-24)

The human shared a retest of the deployed trial and asked to skip what was already fixed. Items 1–5 (landing example links, `www`, the sign-up message, the banner duplicate and its separator) are fixed on this branch and not yet deployed; `www` is the human's DNS action.

**New item 6: a text file named `.png` returns 502.**
- **Cause.** The Workers validator sent the bytes to Cloudflare Images. The decoder refused the input with a code outside the two mapped to `INVALID_IMAGE`, so the error became `502 STORAGE_PROVIDER_ERROR` ("storage could not be reached"). The upload also stayed as a retryable "incomplete" entry.
- **Fix.**
  - The validator compares the PNG, JPEG or WebP signature with the declared type before any decoder call; a mismatch is `422 INVALID_IMAGE`.
  - Completion discards an upload the server refused (any 422) through the normal delete path, which removes the staged bytes. Provider failures keep the upload pending for a retry.
  - The studio drops the refused card and explains that the file isn't a valid PNG, JPEG or WebP image and wasn't kept.
- **Checks.**
  - A unit test confirms refusal with no decoder call. An integration test covers discard on 422 and keep on 502; it fails without the change.
  - API 107 pass / 12 skip / 0 fail; web 67/0; typecheck 0; Biome clean; Workers storage 8/8.
  - Browser simulation of a refused upload: clear message, no card left.
- **Not verified.** The real Cloudflare Images response on the trial, until it is deployed.

**CI.** A high-severity advisory for `body-parser` (GHSA-27r3-jxmh-p828) was published on 2026-10-23 and made `bun audit` fail on every branch. The lockfile now resolves body-parser 2.4.0 inside express's existing range.

### Checks (local)

- **Unit tests.** Web 66 pass / 0 fail, including `review-fixes.test.tsx`:
  - de-duplication and separators;
  - `https://` completion and the values it leaves alone;
  - landing links that avoid `/p/illustrative-example`.
- **Static checks.** Typecheck exit 0; Biome clean (485 files).
- **Browser checks on the local production build** (`work/audit-tools/review-verify.mjs`), 9 of 9 passed:
  - with the browser check bypassed, a short password shows "Use a password of 10 to 128 characters.";
  - `?verified=1` in English and Arabic shows the confirmation and a sign-in link with no form, while `?verified=1&error=INVALID_TOKEN` keeps the alert and the form;
  - the landing example links avoid `/p/`, "Project details" still opens in place, and a direct visit to an example link returns 200;
  - the banner names "(Profile / Website)" once without `؛`;
  - `github.com/qa-review` becomes `https://github.com/qa-review` on blur.
- **Upload state with simulated storage** (`upload-state.mjs`, storage replies faked in the browser), 3 of 3: the in-flight card says uploading, no "incomplete" text or retry appears, and the upload completes as before. The draft did not keep the simulated id.
- **Playwright e2e:** 56 passed.

### Not verified

- The hosted trial (these fixes are not deployed), real storage uploads, and browsers other than Chromium.

## 2026-10-23 — Console redesign, infinite lists and the studio account page

Request: the human asked for the best option on account deletion ("سوي الافضل"), a dashboard "very organised like other companies' dashboards", whether shadcn should be used, whether infinite React Query should be used, and for proactive decisions ("انا مو لازم اعلمك كل شي"). Branch `claude/modest-davinci-osg31w`, on top of the open TanStack Query work. Nothing was deployed.

### Administration console

- **Component kit** (`features/management/admin/ui/`):
  - Page header with an optional back link, inline badges and actions.
  - Metric cards; panels; key/value grids; status badges; initials avatars.
  - Debounced search, filter selects and a toolbar with a clear action.
  - Empty and error states; skeleton loading.
  - `DataTable`: real table semantics, stacked cards on phones, a screen-reader loading status, a "load more" button plus an automatic near-the-end sentinel, and row clicks routed through the row's own link.
- **Infinite lists.** `useAdminList` (TanStack Query `useInfiniteQuery`) follows each endpoint's paging: a keyset cursor for accounts, sites, reports and requests, and an offset for audit and notices. One list grows as the reader scrolls.
- **Navigation.** Overview comes first, then three groups: Moderation (reports, sites, accounts), Operations (data requests, notices, activity log) and Administration (staff, system). Each page has its own icon, and detail routes keep their section highlighted.
- **Pages.**
  - Overview: metric cards, a needs-attention list with counts, and recent activity.
  - Accounts, sites, reports, data requests, notices and the activity log: filterable tables. The activity log's identifier and date filters sit behind "More filters", and the activity log shows one row per request with its outcome.
  - Account, site, report and request details: a header with status badges and actions, related tables, and a details card.
  - Staff: a people table plus a permission matrix.
  - System: configuration and maintenance lists.
  - Dialogs use the shared form fields.
- **Removed.** The legacy `ReadState`/`DirectoryFilter`/cursor controls, `admin-pagination.tsx`, `reports.module.css`, the unused admin styles and the "not implemented" overview footnote.
- **Accuracy fix.** The administrator removal warning now says stored images are queued for deletion; they always were, but the text said they remain.

### Navigation order (follow-up request)

The human asked to reorder the sidebar tabs ("سوي اعادة ترتيب للتابات"). New order:
- Overview.
- Users & content: accounts, sites.
- Trust & safety: reports, data requests.
- Operations: notices, activity log.
- Administration: staff, system.

The order follows how often staff use each page and how records relate (accounts own sites; sites receive reports). Reports and Data requests show a count of waiting items, red when a request is overdue. The count comes from the same permission-scoped overview query as the Overview page.

During this check the production build showed the phone menu button beside the logo on desktop: a stylesheet-order clash with the shared icon-button class. Its rules are now scoped to the sidebar bar.

Checks: web 60/0, typecheck 0, Playwright e2e 56 passed. Screenshots of desktop EN/AR and phone AR: console-v2-navigation.png.

### Studio account page

- **Server** (`lib/auth/index.ts`, `account-deletion.ts`, `hooks.ts`, mail templates).
  - **Profile.** `update-user` accepts only a trimmed name of 1–80 characters.
  - **Email change.** `changeEmail` needs configured mail; otherwise it returns 503 `MAIL_UNAVAILABLE`. A verified account first approves the change from its current address (new "change-email" message naming the escaped new address), then confirms the new address (new "new-email" wording, chosen from the verification token's request type).
  - **Deletion.** `deleteUser` always needs the current password (`PASSWORD_REQUIRED` otherwise), and wrong passwords count against the existing per-account budget.
    - Staff accounts are refused (`STAFF_ACCOUNT_DELETION`).
    - Owned public sites are revalidated, the cascade removes the rows, and the sites' stored images are queued for deletion.
- **Web.** The studio has a new Account section with five cards:
  - Name.
  - Sign-in email: the two-step change.
  - Password: change it, with "sign out of my other devices" on by default.
  - Signed-in devices: readable device names, sign out one device or all others.
  - Delete account: password plus a typed word, a draft-export shortcut, and a procedure note instead of the form for staff.
- **Privacy page.** It now points to the Account page for these actions.
- **Layout fix found during QA.** On wide screens the fixed studio sidebar covered the public notice bar, and Arabic notices were completely hidden. Inside the notice shell the sidebar now starts under the notice.

### Decisions

- **shadcn/ui was not adopted.** It is built on Tailwind CSS and Radix. This app has its own tokens, CSS modules and tested RTL controls (select, dialog, tooltip, drawer), so adding shadcn would mean two styling systems and duplicate controls. The console kit follows the same patterns: tables, badges, cards and toolbars. This can be revisited if the whole web app moves to Tailwind.
- **Self-service deletion was chosen** over a request to staff, on the human's "do the best". It is immediate, password-confirmed and staff-guarded.

### Checks (local)

- Unit and integration tests:
  - API: `account-self-service.integration.test.ts` 4/4 (profile bounds, mail requirement, deletion with password and cascade/queue, staff refusal); mail templates 7/7.
  - Web: 60 pass / 0 fail (console markup, operations, requests, reports, permissions, new account-page tests).
- Typecheck exit 0; Biome clean.
- Browser QA (local API, `next dev`, fictional data):
  - Accounts loaded 20 rows, then 41 on scroll (3 keyset reads), ending with "All results shown".
  - Search sent one request after typing paused.
  - A row click opened the account.
  - A notice created through the dialog appeared as "Live" without a reload.
  - A report marked "Reviewing" updated its badge.
- Studio account flow:
  - Signing out the other device removed it from the list.
  - Saving a new name updated the sidebar.
  - A wrong current password showed its message.
  - The password change succeeded, and its confirmation stayed after the session replacement.
  - The email change showed the honest mail-unavailable message (no mail is configured locally).
  - The delete button stayed disabled until the password and word were given; deletion then signed out. Signing in afterwards returned 401, and the public page returned 404.
- Screenshots: console overview (EN and AR), accounts (EN, AR at 390 px), site and report details, studio account (EN, AR at 390 px) in `docs/screenshots/console-v2-*` and `studio-account-*` (removed in the 2026-10-24 cleanup; kept in Git history).
- Full guarded API suite: 103 pass / 12 skip / 0 fail. Playwright e2e: 56 passed (2.8 min), using the local Chromium alias.

### Not verified

- Real email delivery for the email-change messages; the hosted trial; Safari and Firefox.

## Brand v2: rebuilt folded-band emblem with Readex Pro — 2026-10-23

Request: the human rejected logo v1.3 ("not convincing at all") and asked for professional work, rebuilding if needed. Three new directions were shown on a design canvas (wordmark with rhombus dots, viewfinder frame, arch). The human then asked to keep the original emblem idea, and chose the balanced emblem weight and the Readex Pro wordmark. Nothing was deployed.

### Audit of the original emblem

Angles were not true 30-degree hexagon angles; the two bands differed; the gap between them varied and closed to zero at the bottom join; the blue band's top end had an unrelated diagonal cut; only outer corners were rounded. Large-scale render on a grid: before/after variants.

### Rebuild

- `docs/brand/v2/generate.py`: pointy-top hexagonal ring (inner half-width 0.32 of the outer), two vertical channels continuing the inner hexagon's sides, bands congruent under a 180-degree rotation, uniform gap 0.07 R, fillets 0.11 R (outer), 0.03 R (inner), 0.015 R (cut ends). Readex Pro 600 (SIL OFL 1.1) outlined with HarfBuzz for `Ichnara` and `إيكنارا`.
- Options shown before the choice: inner ratios 0.32 / 0.24 / 0.38 and a single-colour emblem; Readex Pro vs Alexandria wordmarks; app icon at 160/64/32 px, browser tab at 16 px, dark footer, headers in both languages.
- `scripts/build-brand-kit.py` rewritten for v2: duo, reverse, ink, violet and white lockups in both languages, wordmarks, emblems, favicon/app icon (white emblem on indigo), overview board, manifest v2.0 and `brand-artwork.ts`. PNGs rendered with the existing script; ZIP v2.0 (CRC passed); v1, v1.1, v1.2 and v1.3 archive URLs redirect to v2.0. The capped-I initial files and the Noto Sans Arabic licence are retired from the kit; the Readex Pro licence is included.
- App: `Brand` colours the emblem's second band with `--brand-emblem` (#3f46c8 on light, #a4a9ff on the dark footer); the emblem renders 32 px tall in both languages, Arabic descender space trimmed from the row.

### Checks

Typecheck exit 0; Biome clean; web 58/58 (the brand test compares rendered geometry with the delivered master files); Playwright 56/56. Local production build screenshots: English header, Arabic header, Arabic footer.

### Limits

A construction record and a human choice, not a user study; legal availability of the name and mark is still unverified (see `docs/brand/VERIFICATION.md` (removed in the 2026-10-24 cleanup; kept in Git history)). Chromium only.

#### Optical correction (same day)

Asked whether the weights were right, the agent measured instead of assuming: the chosen 0.32 emblem's bands were 243 font units against Readex Pro stems of 142 (1.7 times), and the 0.07 gap was 1.1 px in the 32 px header and 0.34 px in a 16 px favicon, so the bands merged at small sizes. Correction within the chosen design: inner ratio 0.36 (bands 1.5 times the stems), gap 0.10, emblem 1.10 times the capital height (30 px in headers, capitals still 27 px), and a small-size master with a 0.16 gap for the favicon and app icons. Comparison: logo-v2-optical-correction.png.

## Branded authentication emails — 2026-10-23

Request: the human asked to add the new logo to the platform's emails professionally ("زبط هذي"). Branch `claude/modest-davinci-osg31w` from `main` `16464e6`. Nothing was deployed and no email was sent.

### Change

- `apps/api/src/lib/auth/mail-templates.ts`: verification and reset emails rebuilt as table-based, inline-styled HTML (renders the same in Gmail, Outlook and Apple Mail): hosted logo with alt text (the brand name shows when images are blocked), title, greeting, intro, a table button, the link lifetime, the copy-link fallback, and a footer with the ignore notice and an automated-message note. Hidden preview text, `color-scheme: light`. Arabic emails are right-to-left with Tahoma first; the plain-text part carries the same content.
- Logos: `ichnara-email-en.png` and `ichnara-email-ar.png` rendered by `scripts/render-brand-kit.ts` from the v2 duo lockups at one scale (2x). The URL is built from the API's `WEB_URL`, so it points at the deployed web origin; it resolves only after the web app carrying these files is deployed.
- Link lifetime: the emails say one hour; `AUTH_LINK_MINUTES = 60` now sets Better Auth's `emailVerification.expiresIn` and `resetPasswordTokenExpiresIn` explicitly (both were the same library defaults). Only the reset email says the link works once (reset tokens are consumed; verification links are signed tokens).

### Checks

Mail template tests 5/5 (logo URL and alt text in both languages, link lifetime, PNG files exactly twice the declared display size); guarded API 97 pass / 12 skip / 0 fail; Workers mail checks 15/15 (mocked transport); typecheck 0; Biome clean. Rendered preview of both languages: auth-email-v2.png.

### CI follow-up: MFA fixture addresses

The first CI run of this branch failed one test, `native password reset revokes TOTP proof without disabling the enrolled factor` (`tests/fixtures/mfa.test.ts`): `/two-factor/verify-totp` returned 429. Better Auth's two-factor plugin limits `/two-factor/*` to 3 calls per 10 seconds per client address, and the fixture picked each call's address at random from 254 values, so four calls inside one window occasionally shared an address. The email change does not touch this path. Fix: each fixture call now takes the next distinct address from a random starting point (`127.88.x.y`, 64,516 values), so unrelated calls never share a budget; no product code or limit changed. Checks: `bun test tests/mfa.integration.test.ts` 3 consecutive runs, 1 pass / 0 fail each; guarded API 97 pass / 12 skip / 0 fail; typecheck 0; Biome clean.

### Not verified

Real mailbox rendering (Gmail, Outlook, Apple Mail, dark modes) and image loading from the hosted origin; this needs one real send after deployment.

## 2026-10-23 — TanStack Query in the administration console

Request: the human asked whether React Query had been added to the dashboard, then said "ابدا" (start). Branch `claude/modest-davinci-osg31w` restarted from `main` `d87b3e7` (PR #15 merged). Nothing was deployed.

### Change

- **Cleanup first (separate commit).** `useAdminController` was only ever called with `dialogOnly = true`, so its page, resource-count and account-dialog paths had no caller. It became `useSiteModeration` (site overview read plus the password-confirmed suspend/resume), and the dialog became `SiteModerationDialog`. The unused copy keys (`securityPending`, `accountDetails`, `selfAccount`) and the `Counts` type were removed. No behavior change.
- **Dependency.** `@tanstack/react-query` 5.104.2 in `apps/web`, pinned exactly (see [DEPENDENCIES.md](DEPENDENCIES.md)). Only console modules import it.
- **`admin-query.tsx`.**
  - `AdminQueryProvider` creates one `QueryClient`. The shell renders it inside the authorized console, keyed by session and role, so another session starts from an empty cache. The cache is dropped on sign-out or when the console unmounts.
  - Defaults: 30-second freshness, and one retry only when the API is unreachable or fails on the server. Denials (401/403/404/409/429) never repeat.
  - `useAdminData(path, locale)` keeps the old return shape (`data`, `error`, `reload`) and adds `set` for a write's authoritative result. Errors are translated at render time. An error shows only when there are no rows, so a failed background reread keeps the last good rows (the same rule as the account session on tab return).
  - `useAdminRefresh()` invalidates every console read after a completed write.
- **Reads moved.** Every console list and detail now reads through `useAdminData`:
  - accounts, sites, reports (list and detail);
  - activity, notices, requests, staff, system and overview;
  - account sessions and site-related lists.
- **Writes.** Writes stay explicit password-confirmed `api()` calls. On success they call `useAdminRefresh()` instead of reloading one list, which covers moderation, account actions, notices, requests, report transitions and audit export. Revealed emails and other write results are kept in component state and never enter the cache.
- **Left as they were.**
  - The authorization gate's permission read is still a direct request, so each session is gated fresh.
  - The MFA enrollment and challenge pages are outside the console provider.
  - The studio (its own draft/revision controller) and the studio inbox/releases dialog (`usePage`) are unchanged.
- **Layout fix found during QA.** On a 1280×720 window, the desktop console sidebar (sticky, full viewport height) cut off "My security", the studio link and the sign-out button with no way to scroll to them. The sidebar now scrolls on its own (`overflow-y: auto`, `overscroll-behavior: contain`). The phone top bar keeps `overflow: visible`, so the fixed drawer is unaffected.

### Checks (local)

- Typecheck exit 0; Biome clean (475 files).
- Web unit tests: 58 pass, 0 fail. The console render tests now wrap pages in `AdminQueryProvider`; the moderation dialog test follows the rename and drops the unreachable account-dialog assertion.
- Browser QA (`work/qa/admin-query.mjs`, production build via `next start`, local `folio_test`):
  - Setup: fictional owner account plus a separate ordinary account with a published site. A staff-owned site is correctly refused moderation, so the target must belong to an ordinary account.
  - First visit to Sites: one list read, and the seeded site rendered.
  - Accounts and back within 30 s: the rows showed immediately, with no loading state and no new list read (1 read total).
  - Opening the site by link and suspending with reason and password:
    - The detail changed "Suspended" from No to Yes without a manual reload. The detail, its reports and its audit history were reread.
    - Back on Sites, the list was reread on return and showed "Suspended: Yes".
  - After 31 s, a simulated tab return reread the list. With that reread forced to fail, the rows stayed and no alert appeared in the page.
  - Sign-out was reachable at 1280×720 and led to `/en`. Going back showed the access gate, not the cached rows. No page errors.
- Screenshots: admin-sidebar-720-en.png and admin-sidebar-720-ar.png. The sidebar is scrolled to its end on a 720 px tall window; the sign-out button sits at y≈654 px in both languages.
- Playwright e2e suite (`bun run test:e2e`, local isolated stack): 56 passed (2.7 min). The first attempt did not start any browser because the installed Playwright expects a newer Chromium build than the container provides; the rerun pointed `PLAYWRIGHT_BROWSERS_PATH` at the existing local alias of the provided Chromium.

### Not verified

- Behavior on the hosted trial; Safari and Firefox.
- The bundle-size difference was not measured.

## Studio startup — 2026-10-22

### Problem and design

Main `a7eb3d3` hides the workspace behind sequential session and owned-site requests. Branch `codex/studio-startup` was created from freshly fetched main in the independent GitHub checkout. The initial production baseline and neutral-frame/cancellation design were recorded before application implementation. The later human-approved server binding and measured preview correction are described separately below.

Reuse the real sidebar/header/editor/preview layout and fixed public labels. Account/draft areas contain neutral blocks, never invented data. Only language switching works during startup; other controls are disabled. One visually hidden localized live status, outside the busy subtree, updates after ten seconds. Static blocks have no animation, including reduced motion. Keep full-screen errors/retry and sign-out; a verified absent site goes directly to onboarding.

Start one page-local site read alongside session verification only with the existing identity-free hint and transient cross-tab observation. Subscribe before starting; invalidate on native mutation, cross-tab event, identity change or unmount. Verify the native session synchronously before and after awaiting. Discard failed/401/mismatched speculation and use the existing authenticated read. No private persistent cache is introduced.

Installed Better Auth1.7.7 broadcasts sign-out/updateUser through storage but omits cross-tab sign-in. The human explicitly approved a stronger private response binding on2026-10-22: only requester `userId` and native session-record `sessionId`, outside `Site`, never a token/secret, never logged, and still private/no-store. Both must exactly match the successfully checked session. The route derives them from the same existing `requireAuth` context that authorizes the owned read. Missing metadata on an older API triggers authenticated fallback.

An identity-free transient BroadcastChannel mirrors native mutation signals between open application tabs; the receiver invalidates speculation and refetches the unchanged native session atom. No IDs/private values are sent or persisted. If the channel is unavailable, startup remains sequential. The Better Auth client option object, `useAccountSession`, cookies, CORS and CSP are unchanged. Backend ownership remains authoritative.

### Files and behavior

- Studio skeleton/style, real sidebar/header/preview and extracted `sections/content-header.tsx`: shared chrome/geometry, neutral data, disabled controls, localized status and real language switching.
- `use-studio-controller.ts`, `startup-site-read.ts`, `use-startup-site-read.ts`, web API/auth helpers: mount-local speculation, cancellation, synchronous native verification and safe fallback.
- API response helper/site GET, shared contracts, API requester tests and web mismatch tests: exact double-ID binding, unchanged Site DTO, private401/no-store behavior.
- `portfolio-preview.tsx`: initial device scale is measured before paint, preventing the existing390px fallback scale from flashing before the real width.
- Browser fixtures/session tests, seven startup journeys and project-owned E2E temporary directory: real authentication within its unchanged native budget, held responses, geometry and session-change regressions. Original session tests retain their meaning.
- API, decisions, source structure, dependency/deployment notes, changelog, status, screenshots and numeric evidence document the final contract and verification.

### Measurement method

Production Next build/start on4301, existing production-policy local proxy4300, Bun/Hono API4400, owned loopback PostgreSQL55436 database `folio_test`, Chromium at900px height. A generated real account with a real site and the existing hint is reused within each matrix; every sample opens a new page. Ten samples per Arabic/English ×1440/390 ×0/1500ms response-delay cell:80 before and80 after. Delayed routes fetch real API responses before holding each1500ms. No fabricated response bodies.

First visible UI and first editable profile input are sampled with requestAnimationFrame from navigation, after loaded layout CSS is observed. Resource timing records only allowlisted API pathnames and numeric start/end times. Fonts settle before the final whole-page CLS observation. Initial/loaded fixed-frame bounds are compared. The fixture has no stored assets and storage is unconfigured: zero asset URL requests; asset-backed waterfalls are not verified.

The exploratory untouched baseline used Next16.4.0. Audit reproduced two advisories on main's original lockfile, so the formal before matrix was repeated with the same Next16.4.1/OpenNext1.20.13 pair used after. The accepted comparison uses that formal baseline, avoiding dependency-version attribution.

Local reproduction commands (the measurement harness/raw logs are ignored, project-owned artifacts):

```sh
TMPDIR="$PWD/work/studio-startup/tmp" TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55436/folio_test bun --no-env-file scripts/test-e2e.ts --config=work/studio-startup/measure.config.ts
python3 work/studio-startup/gates.py accepted
```

The source-only gate copy installs its own frozen dependencies and receives only isolated loopback test configuration, project temporary paths and disabled dotenv/metrics flags. No hosted environment file is opened or copied.

### Before/after medians

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

The request timing samples, individual first-UI/editable/CLS observations and medians are retained in numeric evidence. The baseline has0/80 overlapping session/site reads and80/80 full-screen loading appearances. The final result has80/80 overlaps and0/80 loading-screen appearances. No hosted improvement is claimed. The maximum measured fixed-frame delta is0.1875px; the expanded browser checks allow at most1px.

### Layout evidence

The fixed sidebar/header/editor/preview and mobile layout retain their bounds. Browser assertions additionally compare the preview toolbar, expansion row, canvas, browser bar, content navigation, first editor-card origin/width and language trigger within1px. Unknown document content height is deliberately excluded. Mobile's hidden preview is excluded from visible geometry assertions.

A stronger transition test initially found CLS0.022339 in Arabic desktop even though fixed panel bounds were unchanged. Browser source rectangles identified the private preview's390px initial fallback width expanding to634px after paint. Moving only the initial measurement/observer setup to a layout effect fixes that flash. Four focused final transitions, after fonts settle and with both API responses held, each report CLS0. This is transition CLS, distinct from whole-page navigation CLS in the80-run table. No assertion was loosened.

Screenshots of the real held-response frame and loaded fixture are retained for Arabic desktop, Arabic mobile, English desktop and English mobile, with adjacent `studio-startup-loaded-*` pairs. No account data appears in the skeleton; loaded screenshots use generated local fixtures.

### Verification

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

### Verification corrections and dependency prerequisite

- Main's original manifests/lockfile reproduced Next16.4.0 high GHSA-p3m5-59mp-jv5r and critical GHSA-2464-fhr4-w9xw audit failures. `bun info next@16.4.1 --json` and adapter1.20.13 metadata confirm stable paired releases, Node>=20.9, React19 and Next>=16.4.1 compatibility. Existing dependencies only; no new direct dependency. The two cache reliability patch hunks are preserved; upstream now includes the preview-props manifest entry. [Server Actions advisory](https://github.com/advisories/GHSA-p3m5-59mp-jv5r), [image optimization advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw).
- Shared dependency links let an intermediate bundler resolve unpatched Next outside the check copy. A fresh frozen install inside the copy fixes that harness issue. This did not independently prove the older adapter incompatible; the maintained pair is the tested choice.
- System temporary-directory quota required project-owned temporary paths; no unrelated temporary data was deleted.
- An intermediate shell-only snapshot accidentally included parallel-barrier tests, so it was stopped and rerun with matching tests. It is not a passing final result.
- An intermediate benchmark discovered a copied second matrix and overlapped another database run. Those results were rejected. Final discovery explicitly excludes both source-copy directories, reports one test, and all final database work is serialized. The original formal baseline was preserved.
- An early API test assumed a separate native HTTP response contained a session without checking status, then failed on a missing property; its exact status is unknown. The corrected test selects only the generated requester's sole session record ID, never its token, and still verifies the real private-route requester, empty-site case and signed-out401. No native rate limit was changed.
- Outer bounds alone missed an86px preview-canvas movement. Reusing real preview chrome and the fixed content header corrected it; expanded geometry assertions and the independent CLS regression now cover the visible transition.

### Manual rollout after review/merge

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

### Limits and handoff

No deployment, Cloudflare/Neon/R2/Resend resource/account mutation, hosted application/provider test, hosted database test or production migration occurred. GitHub branch/PR publication is explicitly authorized. No secret was inspected, copied or committed. No hosted cold-start/Neon autosuspension, real asset/R2 upload, mail, physical device, Firefox or WebKit evidence is claimed. Chromium and local generated data only; the response delay is a simulation. Whole-page CLS and settled transition CLS are different measurements. Cross-tab sign-out and identity-free invalidation are real browser tests; exact mismatched account/session bindings are focused unit/API tests, not a hosted multi-account acceptance claim.

The unrelated untracked `docs/ADMIN_CONSOLE_TASK.md` remains untouched. Branch `codex/studio-startup`; [PR11](https://github.com/2ve2/FolioCraft/pull/11) targets main and remains unmerged. Source commits: `9f2f92f fix(build): update compatible security releases`; `c69cd20 feat(studio): show frame during safe startup`. The separate evidence commit follows its completed full gate rerun.

Source `c69cd20` additionally passed GitHub validate, workers, integration and e2e jobs in [run39836222837](https://github.com/2ve2/FolioCraft/actions/runs/39836222837). This is observed remote success for that source commit, not a prediction for the subsequent documentation head.540 tracked non-Markdown files match the independently installed source-only gate copy byte-for-byte; zero mismatches. Changed Markdown contains no Arabic characters.

Cleanup actually verified:0 users remain in the owned local database; owned PostgreSQL stopped;4300/4301/4400/55436 are closed. No reset/drop was used. All task logs, raw measurements and temporary build/runtime material remain ignored under project-owned work/. Active source work:none. Local blockers:none. Next action: human review of PR11 and its current checks, then the manual rollout above. No merge or deployment was performed.

## Signed-in entry and tab-return session checks — 2026-10-22

Context: after PR 2ve2/FolioCraft#9 the human reported three things on the hosted trial: (1) a loading page before the product page when opening the site, (2) a sudden loading page after switching to another browser tab and back, and (3) the bare address showing the product page although they were signed in ("shouldn't it open the studio directly?"). Hosted behaviour could not be observed from this session (network policy blocks lord2ve.tech); everything below is local. Nothing was deployed.

Verification environment: Bun 1.4.2; local PostgreSQL 16 `folio_test`; local production build (`next build` + `next start`) with the Bun API; Chromium 1194 through Playwright (`work/qa/loading-probe.mjs`, ignored).

### 1. Loading page before the product page — not reproduced on `main`

- The product page (`/ar`, `/en`) contains no loading screen since PR 2ve2/FolioCraft#2; the probe recorded zero loading-screen frames when opening `/` and `/ar`, signed in or not.
- The language-restoring loading screen existed before PR 2ve2/FolioCraft#2. Unknown: which web version runs on the trial. If the bare address does not become `/ar` or `/en` there, the trial web Worker predates that change and needs a redeploy.
- Opening the studio still shows a loading screen while account and site data load; that is the optional studio first-load task, not this change.

### 2. Loading page after returning to the tab — root cause and fix

- Better Auth 1.7.7 (`client/session-refresh.mjs`, `session-atom.mjs`) re-fetches `/get-session` on every `visibilitychange` to visible (rate-limited to once per 5 s). On failure it keeps the known session (`data`) and sets `error`.
- The studio, administration shell, administrator security and sign-in screens treated any `error` as fatal, so a failed re-check replaced the open workspace with the full-screen "could not verify sign-in" screen. On the trial a slow or failed API/database response (for example Neon waking from scale-to-zero) triggers exactly this after a tab switch.
- Reproduced locally: studio open, `get-session` forced to 503, simulated tab return → loading screen with "تعذر التحقق من تسجيل الدخول" and a retry button.
- Fix: `lib/use-account-session.ts` wraps `authClient.useSession()` and reports `error` only while no session is known. An expired session is still rejected by the API on the next request (existing 401 handling).
- After the fix the same probe records no loading screen and the studio stays open.

### 3. Signed-in visitors and the bare address

- The session cookie is host-only on the API origin (`api.lord2ve.tech`, decision 2026-10-20), so the web router cannot see it. Changing its Domain or SameSite was not considered (requires explicit human approval).
- Fix: screens that already read the session keep a non-secret hint cookie `ichnara-signed-in=1` (web origin, `path=/`, `SameSite=Lax`, `Secure` on HTTPS, expires with the session; dropped when the API confirms there is no session). It holds no identity and is not a credential.
- `localeRedirects()` sends `/` with the hint to `/<locale>/studio` before the product-page rules, in the same language order (legacy `?lang`, language cookie, Arabic-first browser, English). `/ar` and `/en` still show the product page to signed-in visitors; other un-prefixed rules are unchanged.
- A stale hint (session expired elsewhere) reaches the studio, which redirects to sign-in and drops the hint.
- Privacy notice (both languages) now lists the language-preference and signed-in cookies; draft date 2026-10-22.

### 4. Verification evidence

- Redirects (`next start`): hint + Arabic browser `/` → `307 /ar/studio`; hint + language cookie `en` + Arabic browser → `307 /en/studio`; no hint → `307 /ar`; hint on `/ar` → 200; hint on `/login?lang=ar` → `307 /ar/login?lang=ar` (unchanged).
- Browser probe: signed-in visit to `/ar` sets the hint (value `1`, 7 days, not HttpOnly); `/` then opens `/ar/studio`; `/ar` stays on the product page; after sign-out the hint is gone and `/` shows `/ar`; a stale hint on an English browser ends at `/en/login` with the hint dropped.
- New `e2e/session.spec.ts` (3 tests) passes; reverting the error masking makes the tab-return test fail (mutation check), then restored.
- Gates: typecheck exit 0; Biome 453 files, 0 issues; web 43 pass / 0 fail; full Playwright suite 44/44 before the new spec and the new spec 3/3. Local Playwright used the installed Chromium 1194 mapped to the build name expected by `@playwright/test` 1.64.1.

- CI follow-up: the first CI run failed the tab-return test at sign-in because the full suite exhausts the native sign-in budget (10 per minute per address, all local requests share one loopback address). The spec now signs in through the real API and, on 429, waits for Better Auth's `X-Retry-After` window; the limit is not weakened. Full local suite afterwards: 47/47 passed (2.4 min, including the wait).

### 5. Known limits

- Not verified on the hosted trial. The first visit after signing in on a new device still shows the product page once until a screen confirms the session and stores the hint.
- If the API stays unreachable, the open studio keeps working until its next save, which then reports the existing "service unavailable" message.

## Published portfolio ISR: design and verification

Date: 2026-10-22, Asia/Riyadh. Branch: `codex/published-isr`, from freshly fetched/fast-forwarded main `afac7a3`. Work is exclusively in the independent GitHub checkout. Unrelated untracked `docs/ADMIN_CONSOLE_TASK.md` is excluded. No deployment, hosted migration/test, resource creation, provider-account access or secret inspection occurred.

### Problem, design before implementation and approvals

Every public portfolio view previously fetched the independent API with no-store. Draft isolation and immediate publication withdrawal must survive caching. Before application changes, the scope/design, mutation inventory and official verification were recorded here and in CHANGELOG. The initial installed-adapter diagnostic produced six passing assertions proving unsafe upstream behavior: four failed writes still resolved, while three failed reads returned false/0/false. This was a diagnostic failure finding, not successful invalidation.

The human prescribed OpenNext's official R2 incremental cache plus sharded SQLite Durable Object tags; no KV, regional Cache API, CDN HTML caching, purge token, Cloudflare Queue or staging. Backend revalidation uses a private Service Binding and constant-time checked shared Worker secret, with loopback URL fallback only for local Bun. The human subsequently explicitly approved the narrow reliability patch and preparing a private Standard bucket `ichnara-portfolio-cache` plus `DOShardedTagCache`, within free allowances. Provisioning/deployment remain human-only.

Alternatives were evaluated before the architecture override: eventual KV consistency, per-colo Cache API and CDN purge cannot satisfy the prescribed coordination/reliability boundaries. The implemented choice uses the required official adapters with no time-based regeneration queue. Engineering details below are not separately human-confirmed product decisions.

### Official verification

- [OpenNext caching](https://opennext.js.org/cloudflare/caching): R2 and sharded DO tags, optional regional caches, on-demand revalidation; no time-based regeneration queue needed here.
- [OpenNext custom Worker](https://opennext.js.org/cloudflare/howtos/custom-worker) and [Service Binding entrypoints](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/rpc/): wrapper plus named binding-only entrypoint. A publicly reachable secret-protected route alone is insufficient.
- [Official tag adapter](https://github.com/opennextjs/opennextjs-cloudflare/blob/main/packages/cloudflare/src/api/overrides/tag-cache/do-sharded-tag-cache.ts) and installed1.20.11: exhausted writes/read errors are swallowed. Human-approved Bun patch propagates these failures and underlying SQLite read failures. Inclusive timestamp comparison handles equal milliseconds; monotonic expiration prevents an older delivery overwriting a newer expiration.
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/): Standard includes10GB-month,1M Class A/month and10M Class B/month; excess is billable. [DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/): Free supports SQLite;100k requests/day,13kGB-s/day,5M row reads/day,100k row writes/day and5GB storage. Free excess operations fail. No paid-only feature is required. Account headroom and future usage are not verified; these are not a spending cap or a guarantee of zero charges.

### Implemented cache and security boundary

Original `/p/[slug]` dynamic routes remain unchanged. The default-off Worker passes them to the original handler. Only when explicitly enabled with both bindings does it rewrite root/project/article document GET/HEAD into the hidden ISR tree. Published layouts read only release language; cookie/header-dependent missing/unavailable output falls back to the original dynamic route. Both paths use the existing shared portfolio renderer and metadata/security policy.

A wrapper around the official R2 adapter persists only status200 app entries in that internal route tree with render-start provenance. Data/fetch entries, unrelated platform/auth/admin/studio routes, errors, redirects, negative entries and cookie-setting responses are rejected. A custom adapter name prevents OpenNext CLI from broadly seeding unrelated prerendered pages. No isolate memory cache or browser/CDN HTML caching can bypass tag validation. Successful public HTML has private/no-store browser cache control. ISR HITs avoid API/database reads.

Each full-route entry collects site and slug tags. Render-start time replaces upload time for invalidation comparisons, so an older render uploaded after invalidation cannot look newly valid. Monotonic tag expiration resists reordered invalidations. Public requests to reserved ISR/revalidation paths are rejected, even with the correct secret. Only `PortfolioRevalidation` on the existing web Worker reaches the internal Next route, which additionally validates a bounded strict message and compares fixed-size credential digests using `timingSafeEqual`.

Built-runtime fault injection showed Next can swallow background revalidation errors even after the adapter rejects. The binding entrypoint therefore awaits completion tasks and independently reads persisted site/slug tags plus a unique per-attempt final receipt through the official DO grouping. Missing receipt/read failure returns503. Receipts are retained tag rows; no automatic pruning is implemented.

### Durable mutation inventory and proof

Explicit migration `0010_volatile_daimon_hellstrom.sql` adds only the generation outbox/index/functions/triggers; existing content/auth rows are not rewritten or removed. No cascading FK can erase pending work. Acknowledged generation tombstones prevent ABA during concurrent delivery. Transaction rollback rolls back intent. No destructive migration/reset/schema push was used.

Actual guarded integration tests exercise these paths and inspect persisted generations plus immediate delivery:

- `releaseService.publish`: first/new publication; ordinary draft edits produce no invalidation. `unpublish` and `activate`: pointer changes enqueue in the same transaction.
- `siteDraftService.update`: slug mutation queues both old and new slug. Site tags cover all detail URLs.
- `adminSiteService.moderate`: suspend/resume enqueue and immediately deliver after the authorized mutation.
- `adminUserService.mutate`: native ban/unban update owner visibility; native removal cascades sites. Both bans and account removal persist intent; removal retains IDs/slugs after cascades.
- Site deletion: no separate product deletion endpoint exists. Actual site-row deletion and account cascade are tested at the persistence boundary.
- `assetService.delete`: an allowed unreferenced asset enters deleting/deleted, enqueuing intent; provider deletion is mocked only in this integration test. Existing referenced-asset rejection remains intact.
- Rejected publication and explicit transaction rollback create no intent. A failed send increments attempts and remains pending. Successful retry acknowledges its generation. An older concurrent delivery cannot acknowledge a newer generation.

Authorized services register affected sites. Request middleware awaits delivery after mutation; each affected site gets priority independently of unrelated backlog. The API Worker supplies request-local binding delivery; local Bun permits only validated loopback fallback. Minute Cron retries oldest bounded batches; daily housekeeping remains separate. Failure logs `cache_invalidation_failed` and invokes configured Sentry capture without secrets/content. Missing binding leaves work durable while caching is disabled.

Healthy target: the next request started after successful invalidation sees the current state. Requests already rendering may complete their earlier snapshot; their late cache entry cannot survive expiration. During a sustained write-only outage with successful tag reads, stale visibility has **no finite maximum**: outage plus backlog/scheduling time. A one-minute retry frequency is not a one-minute staleness bound. Read failures bypass cached HTML. Disable the switch if stale visibility is suspected. No global clock/control-plane propagation guarantee is claimed. Existing signed asset URLs/downloaded bytes retain their prior limitations.

### Actual runtime and browser evidence

`TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55436/folio_test bun run test:e2e` passed **44/44**, zero retries, with cache routing enabled. Real local Chromium, production Next and the real API cover both languages: publish A -> view -> save draft B -> still A -> publish B -> B -> unpublish -> next GET404. The new test requests missing portfolios repeatedly, compares their language-bearing output directly with the unchanged dynamic server, then publishes that same slug and observes a HIT. Existing locale/RTL/auth/ownership/language tests also pass.

The browser runner uses a local proxy with the production rewrite/fallback policy and Next's filesystem cache. This approximation does not establish Cloudflare storage behavior. Separately, `TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55436/folio_test bun run test --public-cache-runtime` passed **15 built-Worker checks** using actual local OpenNext/workerd, R2, SQLite DO and a named Service Binding. It proves:

- root/project/article HITs; warm root has zero additional API reads; Arabic release lang/dir and CSP survive an English visitor;
- cached entries are only200 published app pages and include both site/slug tags; draft B is absent from HTML and all R2 entries;
- missing responses produce no R2 entry, public internal access is404 even with a valid secret, private absent-secret access is401, switch-off uses fresh API;
- real publication/unpublication affects the next HTTP request and all detail routes;
- an older tag write cannot reduce a newer expiration; a held old API read completes its cache write after republishing, yet the next same-detail request displays the newer release;
- renaming only the local test DO table forces real write/read failures: intent remains pending, no false204 acknowledgement, unchecked cache is bypassed; restoring the table allows successful retry and acknowledgement.

The actual expected fault logs are local diagnostics, not provider errors. No remote ingestion was tested. Temporary faults preserve/restore test data. Fixture accounts and their outbox rows are removed on completion.

Local HTTP TTFB from the successful15-check run, ten warm requests per mode:

```json
{"coldUncachedTtfbMs":277.42,"coldCachedTtfbMs":321.97,"uncached":{"count":10,"medianMs":26.09,"minMs":23.93,"maxMs":28.5},"cached":{"count":10,"medianMs":6.61,"minMs":4.93,"maxMs":8.73}}
```

Warm median improved about3.95x in this local run. The first cached route request was slower; this is not proof of cold-start improvement or distributed/trial performance. The uncached cold sample is its actual first route request, without prewarming. An earlier13-check measurement incorrectly labeled a prewarmed uncached request cold and is superseded. The runbook supplies a simple20-request curl loop for the human's before/after trial measurement.

### Quality gates and observed failures

All commands run from the independent checkout; `TMPDIR` points inside ignored `work/published-isr/tmp`. Integration uses only disposable local `folio_test` on127.0.0.1:55436. Raw logs are ignored under `work/published-isr/gates/`. Both completed gate sets are recorded below.

Intermediate failures were repaired and rerun: config bundler could not import `node:async_hooks` (runtime scope moved into Worker); clean build exposed a generated-import declaration issue (explicit ambient declaration); E2E proxy decompressed gzip while retaining headers (request identity encoding); the new missing-page test over-assumed Arabic root language (now compares unchanged dynamic output); actual fault injection exposed swallowed Next errors (persisted receipt); test-only RPC caller needed a current compatibility date. One API run received429 in native recovery after browser activity; the complete suite was rerun after normal rate-budget expiry, without clearing/disabling limits. None is dismissed as pre-existing.

Sandbox commands also failed before execution because synthetic bubblewrap mount registration hit quota. Reviewed unsandboxed local commands were used. Automatic review rejected one broad patch-cleanup command; it did not execute. An exact three-line removal preserved all substantive patch hunks instead. No unresolved permission request remains.

### Files and manual operations

Backend: schema/migration/meta, DB export, config/app/server/Worker, existing publication/draft/admin/assets services, public DTO route/service, cache invalidation service, integration/runtime tests and optional API manifest. Shared protocol is `packages/contracts/src/public-cache.ts`. Frontend: runtime/cache wrappers/configs/declarations, hidden ISR tree/private route/helpers/tests and optional web manifest; original dynamic portfolio source is unchanged. Harness/CI: guarded test runner, cache proxy, browser suite and workflow. Documentation: CHANGELOG, DECISIONS, STATUS, SOURCE_STRUCTURE, E2E, this evidence and PUBLIC_CACHE.

[PUBLIC_CACHE.md](PUBLIC_CACHE.md) gives exact ordered human commands: reviewed backup/additive migration; disabled API/web deploy; private Standard bucket; shared secret by name only; optional SQLite/binding manifests while disabled; separate enable; trial acceptance/TTFB; exact disable/rollback checks. No commands there were executed against providers. Keep additive schema/resources on rollback; do not delete data to hide invalidation failures.

### Not verified and limits

No trial deployment, distributed/multiple-colo behavior, real account free headroom/billing, provider Cron execution, real Sentry ingestion, external mail/storage, Neon migration or trial TTFB was verified. CI execution will be observable only after pushing. Receipts/outbox tombstones and cached route keys grow; there is no pruning/billing hard cap. Failure staleness and configuration propagation have no finite guarantee. Future adapter/Next upgrades require the committed fault/race tests and patch review. Missing-language output is preserved, not redesigned. No screenshot matrix or visual redesign is claimed.

### Gate set A before the backend commit

All eleven commands exited0. Raw output (not fabricated summaries):

- `bun install --frozen-lockfile`: `1 package installed [50.00ms]` (existing pinned patched package; no version/lockfile change).
- `bun audit`: `No vulnerabilities found (checked 539 packages)`.
- `bun run typecheck`: API `tsc --noEmit`, web `next typegen && tsc --noEmit`, E2E `tsc --noEmit -p e2e/tsconfig.json`, exit0.
- `bun run check`: `Checked 450 files in 128ms. No fixes applied.`
- `bun run test:web`: `42 pass`, `0 fail`, `710 expect() calls`.
- `TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55436/folio_test bun run test`: `85 pass`, `12 skip`, `0 fail`, `5388 expect() calls`; `7 Workers database checks passed (unbound)` and `7 Workers database checks passed (local optional binding)`. The enforced-MFA child separately passed11/11 with308 assertions. Twelve parent conditional checks are not newly disabled/quarantined; no skip was added for this task.
- `bun run test:worker-storage`: `8 Workers storage regressions passed; no provider/database requests.`
- `bun run test:worker-mail`: `15 Workers mail checks passed; all outbound traffic mocked, no real email/database/provider request.`
- `bun run build`: `✓ Compiled successfully`; optimized Next build exited0.
- `bun run --cwd apps/web build:cloudflare`: `OpenNext build complete.`
- `(cd apps/api && bunx wrangler deploy --dry-run --outdir ../../work/api-dry-run)`: `--dry-run: exiting now.` No deployment.

The complete feature tree was present during these checks. The backend commit intentionally contains only its completed independently usable step; the already-verified web/runtime/browser step follows as a separate commit after another complete gate set.


### Gate set B, final build repeat and delivery

Before the separate web/cache/runtime commit, all eleven commands above ran again and exited0; raw logs are in `work/published-isr/gates-step2/`:

- Frozen install: `Checked 448 installs across 601 packages (no changes) [35.00ms]`.
- Audit: `No vulnerabilities found (checked 539 packages) [684.00ms]`.
- Typecheck: all three TypeScript commands exited0.
- Biome: `Checked 450 files in 144ms. No fixes applied.`
- Web: `42 pass`, `0 fail`, `710 expect() calls`.
- Guarded API: `85 pass`, `12 skip`, `0 fail`, `5388 expect() calls`; enforced-MFA child `11 pass; 0 fail; 308 expect() calls`; database Workers7 unbound +7 optional-bound checks passed.
- Worker storage: `8 Workers storage regressions passed; no provider/database requests.`
- Worker mail: `15 Workers mail checks passed; all outbound traffic mocked, no real email/database/provider request.`
- Next: optimized production build exited0, `✓ Compiled successfully`.
- OpenNext: `OpenNext build complete.`
- API: `--dry-run: exiting now.`

The cache runtime fixture was repeated against that final generated Worker and again passed15 checks. Actual final-run TTFB: first uncached223.92ms, first cached294.83ms; ten-request uncached median27.84ms (25.22–29.84), cached median5.01ms (4.57–7.50). Warm improvement is about5.56x in this repeat; cold remains slower. The earlier15-check values above are retained transparently, not replaced with a fabricated representative number. Raw final output is `work/published-isr/runtime-last-build.log`.

Branch was pushed and [PR#9](https://github.com/2ve2/FolioCraft/pull/9) opened against main. Backend step: `5c8a9bb feat(api): persist public cache invalidations`. The following web/cache commit completes the prepared feature and documentation; it is not merged. No deployment/provisioning occurred. Hosted CI is pending/not verified at handoff. Original dynamic portfolio sources and shared renderer have no source diff. The unrelated administrative-task Markdown remains untracked and untouched.

### Review fix: retry signal instead of minute polling (2026-10-22)

With the revalidation binding configured, the original minute Cron queried `cache_invalidations` every minute regardless of pending work, which keeps Neon compute awake. Retries are now gated on an R2 signal object (see PUBLIC_CACHE.md). Results: guarded API 88 pass / 12 skip / 0 fail, including "minute retry reads only the R2 signal and opens no database scope while nothing failed", "a failed delivery leaves a pending signal that the minute retry drains and clears" and "a failure recorded while the retry runs keeps the signal pending". The real workerd runtime harness (R2 + SQLite DO) passed 16 checks, including a new real-R2 check: no database scope without a signal, an older etag cannot clear a re-marked signal, and the signal reads `clear` after draining. That real check exposed that R2 etags hash content (identical empty marks collided); marks now carry unique content. Mutations of each new behaviour fail their test.

## Platform color token extraction — 2026-10-22

### Problem and boundary

Platform colors were scattered across global styles, feature modules and one administrative icon. This task centralizes their exact values while preserving the existing rendered output, source cascade, content, behavior and owner appearance. Branch: `codex/platform-color-tokens`, from freshly fetched main `8b49fe2`. Work is confined to the independent GitHub checkout. Unrelated untracked `docs/ADMIN_CONSOLE_TASK.md` is preserved and excluded.

No dependency, layout, spacing, typography, API, authentication policy, ownership rule, schema, migration, provider resource, production configuration or deployment is changed. Public portfolio styles and owner-selected appearance remain untouched.

### Inventory and design

The complete baseline inventory is inventory.json:452 CSS declaration occurrences, including the existing focus token,8 platform system-color occurrences and17 public-portfolio occurrences. The platform migration replaces426 declaration occurrences plus one inline decorative administrative resource-icon value. It centralizes310 exact literal spellings, including the existing focus value. RGB/RGBA/HSL/HSLA literals:0. The inventory scans declaration values, not property names such as `white-space` or selectors such as `canvas`.

palette.json maps every extracted literal to its semantic/component role and its first original use. Existing identical literal occurrences share a token; no near-equal values are merged. `#fff` and named `white` retain separate tokens, as do `transparent` and transparent-black `#0000`. Alpha values and gradient stop order are preserved exactly. Existing base aliases and scoped admin aliases retain their inheritance boundaries. No dark mode is enabled.

Groups: entry/shared controls and modules; workspace/editor/preview chrome; administration. All palette definitions are introduced with the first group so each intermediate state remains valid. Later groups only consume those definitions. The inline icon retains its color through `var(--color-admin-resource-icon)`.

Baseline counts per stylesheet (files with zero literals remain in source and unchanged):

```text
components/ui/product-footer.module.css                 11
components/ui/public-notices.module.css                  3
components/ui/tooltip-button.module.css                 12
features/assets/asset-picker.module.css                 14
features/legal/legal.module.css                        11
features/management/admin/admin-shell.module.css        23
features/management/admin/admin.module.css              73
features/management/admin/operations.module.css          3
features/management/admin/reports.module.css             6
features/management/shared/management.module.css        12
features/not-found/not-found.module.css                 22
features/portfolio/published-shell.module.css           10 (excluded)
features/portfolio/report.module.css                     7 (excluded)
styles/editor-groups.css                                 2
styles/foundation.css                                   34
styles/landing.css                                      23
styles/loading.css                                      13
styles/readability.css                                   5
styles/reset.css                                         4
styles/responsive.css                                    4
styles/scrollbars.css                                   19
styles/select-control.css                               21
styles/tokens.css                                        1 (existing definition)
styles/welcome.css                                      22
styles/workspace-preview.css                             1
styles/workspace.css                                    96
```

#### Justified remaining literals

-8 platform system-color declarations remain in forced-colors rules: tooltip background/text/border (`Canvas`, `CanvasText`), missing-page button border (`ButtonText`), loading sheet/text (`CanvasText`), scrollbar track/thumb (`Canvas`, `CanvasText`). These must follow the user's system palette rather than a fixed brand value.
- `styles/reset.css` retains `red, red` in its unchanged `@supports (color: color-mix(in lab, red, red))` capability query. Custom properties inside that query would change what the browser tests. The rendered placeholder declaration uses the transparent token.
- The17 declaration occurrences in `features/portfolio/published-shell.module.css` and `features/portfolio/report.module.css` remain unchanged because they belong to public portfolio rendering. `packages/portfolio` and owner theme/accent data are untouched. Brand SVG assets and the fictional landing portfolio's theme data are also outside platform CSS.
- `inherit`, `currentColor`, `none` and `auto` remain CSS behavior keywords, not fixed palette values. No platform hexadecimal/RGB/HSL declaration remains outside `tokens.css` and the two excluded public modules.

### Exact visual proof

Local Bun/Hono and a production Next build used an environment-file-free self-contained copy with loopback PostgreSQL `folio_test` on55435. Provider configuration was absent. The fixture signed up through native Better Auth, created and saved a real site through owned domain APIs, received a disposable local staff role, enrolled native TOTP, completed a fresh sign-in challenge and passed `/api/admin/me/permissions`. MFA requirements, CSP, CORS and ownership were unchanged. No application endpoint or forged staff-session proof was added.

The same fixture/database/session stayed alive across both builds. Chromium used deviceScaleFactor1, viewport height1000, reduced motion and a fixed browser clock. Each page awaited its real content, network idle and `document.fonts.ready`; screenshots used fullPage, animations disabled and caret hidden. Browser requests were limited to exact local web/API origins. No screenshot masks, tolerances, color normalization, image resizing or provider mocks were used. Landing/auth/legal were captured anonymously; Studio and admin used the real authenticated session.404 responses were asserted404; other routes200. Every capture had0 page errors.

48 before and48 after screenshots were decoded to RGBA with the installed Pillow library and compared channel-for-channel. All48 have0 changed pixels. visual.json records dimensions, decoded SHA256 values and each diff count. The hashes match for every pair; compressed PNG metadata is irrelevant.

```text
Route       ar390 ar768 ar1440 en390 en768 en1440 (different pixels)
landing       0     0      0      0     0      0
login         0     0      0      0     0      0
signup        0     0      0      0     0      0
privacy       0     0      0      0     0      0
terms         0     0      0      0     0      0
404           0     0      0      0     0      0
studio        0     0      0      0     0      0
admin         0     0      0      0     0      0
```

An independent substitution check expands every new `var(--color-*)` in the final CSS back to its exact original literal. All29 stylesheets outside `tokens.css` match the baseline after ignoring only whitespace/comments; selectors, declarations, ordering, gradients and values remain identical. The inline icon also resolves to its original value. This brackets states outside the captured initial screens without claiming they received interactive browser coverage.

Session-local reproducibility commands from the independent checkout:

```sh
python3 work/platform-color-tokens/inventory.py
bun --no-env-file work/platform-color-tokens/run-visual.ts
## After the before capture, the task signaled the after build/capture:
touch work/platform-color-tokens/capture-after
python3 work/platform-color-tokens/compare.py
python3 work/platform-color-tokens/evidence.py
```

The orchestration constructs an explicit synthetic local environment, rejects external browser traffic, keeps fixture cookies/password/TOTP in memory and deletes its exact account in finally. Raw before/after PNGs, build logs and session-local measurement scripts remain under ignored `work/platform-color-tokens/`. Final fixture cleanup reports1 removed and0 remaining. The exact comparison result is `Compared 48 screenshots; 0 different pixels`.

### Contrast preservation

contrast.json records80 before/after token-pair ratios: principal text/background/focus pairs plus all opaque foreground/background pairs directly declared in the same baseline rule. Ratios use WCAG sRGB linearization with coefficients0.2126/0.7152/0.0722 and `(lighter + 0.05) / (darker + 0.05)`. Every recorded before/after ratio is identical. Representative results:

```text
Platform body/page        14.8552:1
Muted/page                 4.8293:1
Muted/card                 5.0655:1
Primary/white text         7.1882:1
Secondary/white surface    9.4227:1
Error/surface              6.8690:1
Admin body/page           13.5929:1
Admin muted/card           4.9321:1
Admin primary/white text   6.1199:1
Focus/white                4.8177:1
Focus/page                 4.5931:1
```

Existing limitations are retained, not repaired in a zero-change extraction: input placeholder/white3.4978:1; admin focus/white2.6425:1. The resource icon/white3.2731:1 is decorative. The JSON lists every measured pair and whether it meets4.5:1 for normal text; it is not a blanket accessibility certification. Inherited/composited/translucent/background-image/interaction combinations are not exhaustively audited. Exact source/pixel equivalence establishes preservation, not newly improved contrast.

### Quality gates and commit checkpoints

All commands execute in `work/platform-color-tokens/build`, a source-only copy with physically local frozen dependencies and no environment files. Only the explicit disposable local database is supplied. Baseline main and all three stylesheet-group states each pass11/11 commands. There are44 successful command executions across these four checkpoints. No failure is attributed to main without baseline proof.

```text
bun install --frozen-lockfile
Checked448 installs across601 packages (no changes); exit0
bun audit
No vulnerabilities found (checked539 packages); exit0
bun run typecheck
API/web/E2E typechecks and Next typegen; exit0
bun run check
Checked429 files in the completed candidate (425 before JSON evidence additions). No fixes applied.; exit0
bun run test:web
37 pass;0 fail;685 expect() calls; exit0
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55435/folio_test bun run test
81 pass;12 conditional skips;0 fail;5311 expect() calls; exit0
Actual workerd database:7 unbound +7 local-binding checks; exit0
bun run test:worker-storage
8 Workers storage regressions passed; no provider/database requests; exit0
bun run test:worker-mail
15 Workers mail checks passed; all outbound mocked; exit0
bun run build
Generating static pages(50/50); exit0
bun run --cwd apps/web build:cloudflare
Generating static pages(50/50); OpenNext build complete; exit0
(cd apps/api && bunx --no-install wrangler deploy --dry-run --outdir ../../work/api-dry-run)
Total Upload5135.16KiB / gzip939.35KiB; --dry-run: exiting now; exit0
```

The12 conditional skips are unchanged on baseline main; none was introduced or disabled here. The guarded runner also reports `enforced_mfa_suite`:11 pass;0 fail;308 expect() calls. The main source/check count increases only for the four JSON evidence files; follow-up checks cover those additions. No package/lockfile change occurred. `git diff --check` passes.

### Files and completed groups

- Entry/shared group: `styles/tokens.css`, reset/foundation/welcome/landing/loading/select-control; UI footer/notices/tooltip modules; legal and missing-page modules. Documentation: CHANGELOG scope/checkpoints, STATUS, DECISIONS, DESIGN_SYSTEM, SOURCE_STRUCTURE and this evidence with four JSON records.
- Workspace group (completed and verified): workspace/editor/readability/responsive/scrollbar/preview styles, asset-picker and shared-management modules.
- Administration group (completed and verified): shell/admin/operations/reports modules and resource-icon token use in admin-overview.

### Limits and human operations

No provisioning, new secret, migration or deployment is required to review/merge this CSS-only web change. Required human operational commands for this task: none. Any later deployment is a separate human decision; it was not executed here. No Neon, R2, Resend or Cloudflare resource/account was accessed or changed. No actual credentials or runtime environment files were opened, copied, printed or committed.

Not verified: physical devices, Firefox/WebKit, hosted cookies/persistence/provider delivery, every interactive control state in screenshots, actual dark mode or a deployed-trial comparison. Remote CI status is recorded in the final checkpoint below. Local integration/runtime gates are evidence only for their stated local coverage. Branch push, PR and final server cleanup are completed in the final checkpoint below.


#### Workspace checkpoint

Entry committed as `6bcd8e8` (`refactor(web): tokenize platform entry colors`). Workspace styles, asset picker and shared management styles consume exact existing palette roles. All11 workspace-state gates exit0: frozen install448/601, audit539 clean, Biome429, web37/0/685, API81/12 unchanged conditional skips/0/5311 plus native MFA11/0/308 and workerd database14/14, storage8/8, mail15/15, Next/OpenNext50/50 and API dry run5135.16KiB/gzip939.35KiB. The source-only gate copy contains the first two groups; administration remains at baseline for this checkpoint. Full-candidate pixel proof remains48/48 identical. Administration is the next separate step.


#### Administration checkpoint and local acceptance

Workspace committed as `3939be4` (`refactor(web): tokenize workspace colors`). All administration CSS now consumes palette tokens, including fallback values; the decorative resource-icon scalar also resolves to its exact original color. Complete source expansion matches all29 non-token stylesheets and the entire icon component file. The final gate copy matches every current platform source file byte-for-byte.

All11 final-candidate gates exit0 with the result lines above: frozen install448/601, audit539 clean, Biome429, web37/0/685, API81/12 baseline skips/0/5311 plus native MFA11/0/308, actual workerd database14/14, storage8/8, mail15/15, Next/OpenNext50/50 and API dry run5135.16KiB/gzip939.35KiB. No gate failed; the initial sandbox-only local PostgreSQL socket restriction was resolved by an authorized local-runtime retry before tests. The literal audit excludes custom-property identifier words and verifies0 remaining platform palette declarations outside tokens, with exactly8 documented system-color declarations.

All48 decoded screenshot pairs remain identical.80 recorded contrast pairs remain identical. All edited Markdown is English; `git diff --check` and the source Biome check pass. API/shared portfolio files, package manifests, lockfile, migrations and runtime configuration are unchanged. PR creation and PostgreSQL shutdown follow this implementation commit; those actions are not preclaimed here.


#### Final GitHub handoff and cleanup

Source groups are committed as `6bcd8e8` (entry), `3939be4` (workspace), `04320c2` (administration). The branch is pushed; [PR8](https://github.com/2ve2/FolioCraft/pull/8) is open against main, attached to the chat, unmerged and conflict-free at the observed source head. No force-push or merge was performed. The final documentation handoff is a separate commit in the same branch.

All11 gates were repeated before that handoff commit and again exit0 with unchanged counts: install448/601; audit539 clean; API/web/E2E typing; Biome429; web37/0/685; API81/12 unchanged baseline skips/0/5311; native MFA11/0/308; workerd database14/14; storage8/8; mail15/15; Next/OpenNext50/50; API dry run5135.16KiB/gzip939.35KiB. Baseline, three source-group states and handoff total55/55 successful gate commands. There was no skipped/quarantined test added and no dependency/lockfile difference. Final documentation changes are separately checked with Biome and `git diff --check`; these are not claimed to change or retest hosted behavior.

The exact local account cleanup reports1 removed/0 remaining. A final count in this newly initialized disposable database reports0 users. Owned API/web servers were already stopped; owned PostgreSQL was then stopped. Connection probes confirm4300/4400/55435 are closed. No existing server or hosted resource was stopped. Raw screenshots and safe local logs remain under ignored work; no browser storage-state/credential file was created. Unrelated untracked `docs/ADMIN_CONSOLE_TASK.md` is preserved; tracked source is clean after the handoff commit.

Initial [source-head CI run39776686201](https://github.com/2ve2/FolioCraft/actions/runs/39776686201) was observed with validate/integration successful and workers/e2e still running. This is a dated observation, not a failure or a claim of final remote acceptance. The documentation push triggers its own checks; their completion is not preclaimed. Review the PR's current checks before merging. No extra human provisioning, secret, migration or deployment command is required for this task. Active source work:none; local blockers:none; next action:human review of the open PR.

## Optional Hyperdrive latency evaluation — 2026-10-22

### Problem, starting point and boundaries

Task: measure connection/query cost before changing the trial API; prepare optional cache-disabled Hyperdrive and evaluate web-to-API Service Binding only if measurements warrant it. Fetched and fast-forwarded main to `3f85e37`; branch `codex/hyperdrive-latency`. The independent checkout is the only edited/committed working copy. Unrelated untracked `docs/ADMIN_CONSOLE_TASK.md` is preserved and excluded. No subagents.

Read the startup/architecture/operations/source/decision notes and Task 1 pool investigation before implementation. Task 1 proved a local pg-cloudflare normal-close bug, not every historical hosted event. Its graceful-close patch, real-error severity, per-request isolation and transactional driver are retained.

No deployment, provider resource/account change, Neon query/migration, secret inspection/copy, external mail/storage request or staging operation. The human cancelled staging. All application/database runtime checks use disposable loopback PostgreSQL 18.6 `folio_test:55434`. Synthetic credentials remain inside the harness processes; reports contain no credentials/cookies/native signup bodies. Source-only builds exclude environment files and have physically local frozen dependencies.

### Design and source

- `apps/api/src/db/hyperdrive.ts`: optional structural binding/config selector. Absent binding returns an empty override. Bound requests use its connection string; no retry/failover to a second database on bound errors. Origin connections stay request-local/max1 and close in finally; Hyperdrive owns remote pooling.
- Bound mode omits the startup `statement_timeout`, which is session state under transaction pooling. Each new client checks the origin role/database default through `pg_settings`; zero, missing or a deadline above `DB_STATEMENT_TIMEOUT_MS` fails closed before business queries. Keep the server default at or below15s; preserve the independent16s client read deadline. This adds one read per connected bound request, counted in timing/quota evidence. It is not a per-query transaction wrapper.
- Existing publication transactions remain unchanged: Drizzle uses one acquired client and PostgreSQL transactions/locks. No schema, dependency, isolation-default, CORS, session, ownership or public cache change. No new browser-facing strings.
- `apps/api/src/db/timing.ts`, `db/index.ts`, `worker.ts`: opt-in `DB_TIMING_LOGS="true"`, request-local connect/query counters and durations. Correlation comes from the generated response request ID, never an incoming correlation header. Only fixed metadata/numbers are logged, without SQL/parameters/results/paths/addresses/cookies/credentials. Disabled by default. Successful connections are counted; failed setup is not a successful connection sample. Query duration includes wire/driver/queue time, not a database CPU profile. Workers clocks are coarse and advance with I/O; rounded local samples are expected.
- Worker HTTP and Cron both receive the optional binding. Bun's shared pool and unbound request configuration retain their existing values. Liveness still opens no connection.
- `apps/api/tests/hyperdrive.integration.test.ts`: absent binding, rejected origin deadlines, native publication/draft isolation/unpublish, explicit same-backend serializable transaction with release+pointer rollback, server cancellation57014 and reusable client, pg timing promise/callback/error behavior. Startup options in this Bun test emulate an origin default; they are not evidence of a hosted pooler.
- `scripts/test-worker-database.ts`, its fixture and `scripts/test-api.ts`: run the existing seven actual workerd checks in both modes. Bound mode has a deliberately unreachable fallback DATABASE_URL, proving selection for request and actual Cron.12 concurrent scopes remain isolated and real57P01 remains observable. Root/Worker URL guards now also reject protocol/query/hash overrides.
- `scripts/local-statement-timeout.ts`: local-only helper temporarily sets the caller's role/database deadline in disposable folio_test and restores the exact prior override (or inherited state) in finally. Miniflare strips URL startup options from native Hyperdrive bindings, so setting an actual local origin default is necessary. No hosted input is accepted. Run database harnesses sequentially.
- `scripts/measure-worker-database.ts`: native synthetic account/site/publication,35 cycles per endpoint, first5 warmups excluded,30 correlated successful samples, numeric-only JSON, exact-account cleanup. `scripts/measure-service-binding.ts`:30 alternating workerd subrequests via local HTTP versus a native Service Binding to the same real API; test-only caller never enters the deployed web/API.
- `apps/api/wrangler.toml` has comments only for the optional binding; no active Hyperdrive/Service Binding or timing flag, id or secret. Manual runbook is a separate documentation step.

### Official research (checked this session)

- [Pricing](https://developers.cloudflare.com/hyperdrive/platform/pricing/): Free includes100,000 database statements/day; excess fails and counters reset00:00UTC. Queries include reads/writes/schema statements, not just HTTP requests. No plan upgrade is part of this task.
- [Limits](https://developers.cloudflare.com/hyperdrive/platform/limits/): Free10 configurations/account, approximately20 origin connections/configuration,15s initial origin-connect deadline,10-minute idle deadline and60s maximum statement duration. Application deadlines remain tighter.
- [pg driver](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/node-postgres/): minimum8.16.3 with Node compatibility. Existing exact pg8.23.1 and nodejs_compat satisfy this; no added dependency.
- [Connection pooling](https://developers.cloudflare.com/hyperdrive/concepts/connection-pooling/): backend connection is pinned for a transaction; SET state resets when returned. Do not depend on session SET across separate transactions or wrap the entire HTTP request in a transaction to preserve settings.
- [Neon](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/neon/): use the direct PostgreSQL hostname, not an additional Neon pooler/serverless HTTP driver.
- [Caching](https://developers.cloudflare.com/hyperdrive/concepts/query-caching/) and [commands](https://developers.cloudflare.com/hyperdrive/reference/wrangler-commands/): caching is a resource setting, enabled by default unless explicitly disabled. Writes do not invalidate cached reads. The runbook requires `--caching-disabled` and dashboard verification before binding; runtime cannot inspect this remote setting. No query is approved for caching.
- [TLS](https://developers.cloudflare.com/hyperdrive/configuration/tls-ssl-certificates-for-hyperdrive/): default `require` encrypts and validates origin certificates with WebPKI; custom CA/verify-full requires explicit certificate configuration. No verification bypass is added.

### Actual measurement commands and results

```sh
initdb -D work/hyperdrive-latency/pg-data -U folio --auth=trust --no-locale --encoding=UTF8
pg_ctl -D work/hyperdrive-latency/pg-data -l work/hyperdrive-latency/postgres.log -o '-h 127.0.0.1 -p 55434 -k /tmp -c logging_collector=off' start
createdb -h 127.0.0.1 -p 55434 -U folio folio_test
## From the source-only build, with no provider environment:
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55434/folio_test bun --no-env-file run test
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55434/folio_test bun --no-env-file scripts/measure-worker-database.ts --label=baseline
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55434/folio_test bun --no-env-file scripts/measure-worker-database.ts --label=after-unbound
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55434/folio_test bun --no-env-file scripts/measure-worker-database.ts --label=after-binding --binding
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55434/folio_test bun --no-env-file scripts/measure-service-binding.ts
```

The baseline is main plus timing instrumentation only, before adding the binding selector. Baseline API75/0, native MFA11/0, workerd7/7. Each latency run removed exactly1 synthetic account. Baseline local API wall time median/p95, milliseconds:

- Public:5.87/7.38; connection2/4; queries2/3,1 statement.
- Session (`/api/me`, valid synthetic native session):7.21/9.00; connection2/3; queries2/3,4 statements.
- Studio owned draft:6.79/9.57; connection2/3; queries2/4,3 statements.

After implementation, unbound:

- Public:7.08/11.99; connection3/5; queries2/4,1 statement.
- Session:9.71/13.06; connection3/4; queries3/5,4 statements.
- Studio:8.55/12.85; connection3/4; queries3/4,3 statements.

After implementation, native local Hyperdrive binding forwarding to the same local PostgreSQL (NOT actual Hyperdrive origin pooling/TLS):

- Public:6.95/11.88; connection3/4; queries3/6,2 statements.
- Session:9.89/14.89; connection2/4; queries4/5,5 statements.
- Studio:7.85/13.81; connection2/4; queries3/7,4 statements.

These successive small loopback runs do not show a reliable latency gain. The unchanged unbound statement counts and variable connection time show that these are noisy local measurements, not proof of an application speedup/regression. Bound mode costs one additional deadline-verification query. Native local binding coverage does not emulate distributed pooling, TLS setup or Neon wakeup. **Actual before/after Hyperdrive edge latency: not verified.** The optional candidate is prepared but inactive; enable/retain it only after the human's trial comparison shows a repeatable benefit with correct public/session behavior.

Initial Service Binding comparison,30 interleaved samples: local HTTP median6ms/p9511ms; binding median6ms/p9510ms. This is API subrequest time including database work, not Next page render or public-internet edge routing. The median gain is0ms; no Service Binding is shipped. The committed repeatable harness was then run again: HTTP7/11ms and binding7/11ms median/p95, again0ms median gain;1 exact account removed. Current public SSR continues its URL fetch with no session forwarding. Client IP handling is untouched. Hosted routing cost remains unknown; measure it before proposing a new trusted caller/IP boundary.

Ignored numeric evidence: `work/hyperdrive-latency/build/work/database-latency/*.json`; baseline/implementation logs and gate summaries are under `work/hyperdrive-latency/`. Synthetic transport verification used Node/Wrangler help only: `Safe stdin + in-memory Wrangler argv help verified; no provisioning.` It verified absence of the synthetic URI from OS argv; no real credential was supplied.

### Implementation gates

All commands ran in the isolated source-only copy, with Bun1.4.2, no .env/provider configuration and loopback folio_test only. Real result lines:

```text
bun install --frozen-lockfile
Checked 448 installs across 601 packages (no changes); exit0
bun audit
No vulnerabilities found (checked 539 packages); exit0
bun run typecheck
API/web/E2E TypeScript and Next type generation; exit0
bun run check
Checked 425 files. No fixes applied.; exit0
bun run test:web
37 pass; 0 fail; 685 expect() calls; exit0
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55434/folio_test bun run test
79 pass; 12 conditional skips; 0 fail; 5297 expect() calls
Native MFA child:11 pass; 0 fail; 308 expect() calls
Workers database:7/7 unbound +7/7 local binding; exit0
bun run test:worker-storage
8 Workers storage regressions passed; no provider/database requests.; exit0
bun run test:worker-mail
15 Workers mail checks passed; all outbound traffic mocked; exit0
bun run build
Generating static pages (50/50); exit0
bun run --cwd apps/web build:cloudflare
Generating static pages (50/50); OpenNext build complete.; exit0
(cd apps/api && bunx wrangler deploy --dry-run --outdir ../../work/api-dry-run)
Total Upload:5134.08 KiB / gzip:939.14 KiB; --dry-run: exiting now.; exit0
bun run test:worker-monitoring --web-built
28 Workers monitoring checks passed; all ingestion mocked; exit0
```

The12 skips are unchanged conditional MFA/old browser-cleanup cases; the11 MFA tests execute in the enforced child. No skipped/disabled/quarantined test was introduced. First local startup hit sandbox socket denial; authorized retry succeeded. Initial implementation harness failures (Miniflare requiring a synthetic password and discarding URL startup options) were corrected, not attributed to main; no product gate failure is labelled pre-existing. The first ignored gate runner had an unsupported output-capture option and was corrected before gates ran.

### Remaining work and verification limits

Manual rollout/rollback runbook, final documentation commit and PR are pending in this implementation checkpoint. Hosted provisioning, caching-disabled configuration, real Hyperdrive transaction/reset behavior, origin TLS, Neon autosuspension, trial before/after timing, alert delivery and hosted cookies are not verified. Browser UI was not changed or tested by this step; runtime evidence is actual local HTTP/workerd. No schema migration or web deployment is required for this API-only optional candidate. No enabled Service Binding exists to roll back.

### Operational handoff verification

Implementation committed in `ae1749f` (`feat(api): add optional Hyperdrive path`). Added HYPERDRIVE.md with absent-binding deployment first, exact stdin/in-process-argv Wrangler provisioning with caching disabled, origin role/database deadline preservation and restoration, separate binding enable/rollback, bounded public curl and safe projected timing/pool tail. No URI/password reaches OS argv/history/log files or displayed Wrangler output in that procedure. The exact documentation snippet parsed/executed with a synthetic URI and an added --help flag, exit0; it correctly captured no resource id because no create was performed. No provider success is inferred. Operations/Cloudflare/README/source map link to the runbook. Final documentation-step gates and PR/cleanup results follow when complete.

Final review found a CI-only harness issue before handoff: the native local-binding setup unconditionally replaced a supplied test password with the no-password/trust placeholder. Both harnesses now synthesize a password only when one is absent. The disposable local cluster was switched to SCRAM with a synthetic CI-only password; both IPv4 pg_hba entries were checked as scram-sha-256. The full gate run is being repeated against password-authenticated folio_test. Production connection/authentication code is unchanged.

[Initial PR7 run39708626819](https://github.com/2ve2/FolioCraft/actions/runs/39708626819) independently reproduced the harness defect: integration passed the unbound workerd checks, then the bound path returned500 with password authentication failure. Validate/workers succeeded. Logs were inspected through boolean/error-code projections only, not copied or displayed as raw CI output. This is a new branch defect, not a failure attributed to main.

### Final acceptance, remote checks and cleanup

Password fixture correction committed as `194d189` (`fix(test): preserve database fixture passwords`). All eleven required gates plus mocked monitoring passed again against actual local SCRAM authentication before the correction commit, then all were repeated before the documentation handoff. Final acceptance has14/14 successful commands (the eleven gates, monitoring and two benchmark checks). Outputs/counts match the implementation gate block above:448 installs/601 packages, audit539, Biome425, API79 pass/12 unchanged conditional skips/0 fail/5297 assertions, MFA11/0/308, web37/0/685, workerd database14/14, storage8/8, mail15/15, Next/OpenNext50/50, API5134.08KiB/gzip939.14KiB, monitoring28/28. All exit0. `git diff --check` and English-only edited-Markdown scan also pass. Twelve implementation files match the tested build copy byte-for-byte.

The final bound benchmark was also repeated with a supplied SCRAM password:30 successful samples each, public8.45/15.28ms, session11.17/18.18ms, studio9.11/16.83ms median/p95; connections4ms median and7ms p95, query3/6ms for all,2/5/4 statements respectively. These are password-path acceptance samples, not a comparison against the earlier trust-authentication baseline. The third Service Binding run reports HTTP8/9ms versus binding7/7ms; a1ms coarse-clock median difference after two0ms differences does not establish repeatable real edge/page benefit. Both exact fixture accounts were removed (1 per benchmark). No production binding is justified by these local runs.

[Corrected PR7 CI run39709019010](https://github.com/2ve2/FolioCraft/actions/runs/39709019010) on194d189 completed successfully for validate, workers, integration and e2e. The actual Chromium job reports43 passed. Initial integration failure is retained above; it is not labelled pre-existing. This is remote CI on disposable PostgreSQL/mocked providers, not a hosted-trial database test. The final documentation-only commit will trigger its own checks; those are not preclaimed successful here.

[PR7](https://github.com/2ve2/FolioCraft/pull/7) is open against main and attached to this chat; no merge. `HYPERDRIVE.md` and README/Cloudflare/operations/source-map links complete the manual handoff. No provider command, deployment, new secret, hosted migration or Service Binding was executed. Exact human commands and all rollback steps are in the runbook; no schema migration or web deployment is required.

Final local cleanup:0 generated latency accounts remain,0 role/database statement_timeout overrides remain (the inherited prior state), owned PostgreSQL stopped normally, port55434 closed. Miniflare instances dispose in finally; no persistent API/web process was started by these benchmarks. Unrelated untracked docs/ADMIN_CONSOLE_TASK.md is preserved. Active source work:none; local blockers:none. Next action:human review and only then the optional measured trial procedure. Real Hyperdrive pooling/reset/TLS/query-caching configuration, edge improvement, Neon wakeup and hosted session/publication behavior remain not verified; no new manual device/browser/provider acceptance is inferred from CI.

### Review revision (2026-10-22)

The per-client `onConnect` guard was replaced by `useHyperdrive`: one verification per Worker isolate through a separate short-lived client, with a direct `DATABASE_URL` fallback and a `hyperdrive_unverified` warning (reason only) when the origin default is unsafe or Hyperdrive is unreachable; failures are rechecked after 60 s. Statements above that describe a per-request guard or fail-closed rejection apply to the original commit only.

Evidence: guarded API 81 pass / 12 skip / 0 fail, including three new Hyperdrive tests (once-per-isolate with a 10 s origin default on three requests and one check; unsafe 0 s / 16 s and unreachable bindings served on the direct 15 s path with the warning and no connection data; no recheck inside the retry window). Workers database 7/7 unbound and 7/7 bound. Mutations: removing the isolate cache fails "checked once per isolate"; ignoring the check result fails the fallback test. Running the guarded suite twice back to back can fail auth tests because of shared local rate budgets; the unmodified branch reproduces this, single runs pass.

## Full project audit and cleanup — 2026-10-22

Request: after Task 8 the human asked for everything to be checked and cleaned, with fonts, sizes, layouts, visual identity and logos made fully consistent ("professional work, literally"). The human later authorized helper agents for this audit and left the remaining accent-color choice to the agent. Branch `claude/modest-davinci-osg31w` from `main` `efe830c`. Nothing was deployed; no hosted system, secret or provider was accessed.

Environment: Bun 1.4.2; local PostgreSQL 16 `folio_test`; local production build (`next build` + `next start`) with the Bun API; Chromium 1194 through Playwright. QA scripts live in ignored `work/qa` (`visual-audit.mjs`, `type-roles.mjs`, `align.mjs`, `option-shots.mjs`).

### A. Unused code, files and assets

- Tool: `bunx knip@5` (analysis only, not added to the project), then manual tracing of every candidate. Scripts and fixtures that knip flags are run as subprocesses by the test harnesses or documented runbooks and were kept. The public brand kit (`apps/web/public/brand/ichnara`, including the ZIP) is a deliberate, human-approved download and was kept.
- Removed: `admin-panel.tsx` and `admin-overview.tsx` (never mounted; `/admin` renders `AdminDashboard`), the site/account/audit list components, 34 admin copy keys in both languages, 13 unused `admin.module.css` classes and their 8 color tokens, `nativeError`, `reasonSchema` and the unused `services/sites/index.ts` facade. `admin-lists.tsx` became `admin-pagination.tsx`. Legacy text-logo CSS (from before the SVG logo) and its three tokens were also removed. About 1,100 lines in total.
- The permissions test that rendered the dead overview now keeps its policy and copy-parity assertions; the real overview's permission scoping stays covered by the API admin-operations integration test.

### B. Documentation

- STATUS is again a short continuation page; previous sections are prepended unchanged to `archive/STATUS-ARCHIVE.md`. README is a current index; the original handoff README is archived unchanged.
- CHANGELOG keeps newest-first entries from 2026-10-20; the older chronological part (215 KB) moved unchanged to `archive/`.
- Superseded one-off reports moved to `archive/` (handoff notes, route audit, media diagnosis, prototype review, legacy-hostname inventory, SMTP diagnosis, admin evidence canvas, earlier editorial brand study). `docs/brand/review-round-2` stays because `scripts/build-brand-kit.py` reads it. A link check over all Markdown finds 0 broken relative links.

### C. Visual identity

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

Comparisons: sign-in 1440, sign-in 390, studio appearance, 404. The current rules are recorded in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

### D. Correctness and security review

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

### Gates

Final run on the last commit of this audit (local, `folio_test`): `bun audit` no vulnerabilities; typecheck exit 0; Biome clean; web 58/58; guarded API 93 pass / 12 conditional skips / 0 fail; Playwright 54/54; OpenNext build exit 0 (the `_headers` file is copied into `.open-next/assets`). Each fix commit lists its own checks.

### Known limits

- Visual checks use Chromium only; Safari/Firefox, physical devices and real screen readers were not tested.
- Nothing here was verified on the hosted trial.

## Deployment readiness: migration command and signup email verification — 2026-10-22

Request: after PR #12 the human ran `bun run db:migrate` in the independent checkout and it failed with missing `DATABASE_URL`, `BETTER_AUTH_SECRET`, `API_URL` and `WEB_URL`. The human also asked to turn signup email verification on, enable the published-page cache and add Sentry, with clear instructions. Branch `claude/modest-davinci-osg31w` (main `c06c5d2` merged in). Nothing was deployed; no hosted system, secret or provider was accessed.

### Migration command

- Cause: `src/db/migrate.ts` imported the application database module, which validates the whole API environment, so applying SQL demanded auth secrets and origins.
- Change: the script validates only `DATABASE_URL`, opens one connection, prints `Applying migrations to <host>/<database>` (no credentials) and closes the pool even on failure. A missing or non-`postgresql://` URL prints one readable line and exits 1.
- Checks (local `folio_test`, clean environment via `env -i`, `bun --no-env-file`):
  - no URL → `Set DATABASE_URL to the database you intend to migrate`, exit 1;
  - `postgres://x` → `DATABASE_URL must start with postgresql://`, exit 1;
  - only `DATABASE_URL` set → `Applying migrations to 127.0.0.1/folio_test`, `Migrations applied`, exit 0.
- The guarded API test wrapper (which runs `bun run db:migrate`) and the e2e runner (which runs the script directly) still pass.

### Signup email verification

- Both API manifests (`wrangler.toml`, `wrangler.cache.toml`) set `TRIAL_SKIP_EMAIL_VERIFICATION="false"`. It takes effect only when the API is redeployed.
- Studio: a signed-in session whose account is not verified now shows "confirm your email" with a resend link, retry and sign-out, instead of the generic load error. `EMAIL_NOT_VERIFIED` in other studio operations shows the same message.
- Local proof with production settings (`NODE_ENV=production`, HTTPS origins, `MAIL_TRANSPORT=resend_http` with the Resend HTTP call intercepted in-process, local `folio_test`; script kept in ignored `work/qa/verify-flow.qa.ts`, the test account deleted afterwards):

| Step | Result |
| --- | --- |
| Sign up | 200, `token: null`, no session cookie, 1 verification message submitted |
| Sign in before verifying | 403 `EMAIL_NOT_VERIFIED`, a fresh message submitted (2 total) |
| Open the verification link from the message | 302 to `https://<web>/ar/verify-email?verified=1` |
| Sign in after verifying | 200 with a session |
| `GET /api/sites` with that session | 200 |

- Not proven: hosted mailbox delivery (Resend acceptance was recorded on 2026-10-20; receipt was not), the studio unverified screen in a real browser with a hosted pre-existing session.

### Gates

Typecheck exit 0; Biome clean; web 58/58; guarded API 93 pass / 12 conditional skips / 0 fail; Playwright 54/54 (2.8 min, local Chromium).

## Database pool error investigation — 2026-10-21

### Problem and scope

Historical API Worker events contain only event/name, so the hosted cause cannot be recovered from the supplied context. Started from fetched, fast-forwarded main at ba37ac6, branch codex/pool-error-diagnostics. Existing untracked docs/ADMIN_CONSOLE_TASK.md is unrelated and untouched. No actual secrets/env files were opened, copied or logged. The later human permission for Neon experiments was not exercised.

### Step 1: diagnostics and code trace

Added apps/api/src/db/pool-diagnostics.ts and tests/pool-diagnostics.test.ts, wired through db/index.ts and worker.ts. Only finite allowlisted names/codes, stage and actual pg ending/ended flags are emitted; unknown values become unknown. No arbitrary error serialization, getters, messages, stacks, SQL, parameters, clients or cause chains. Existing console.error severity is retained.

Trace findings:
- worker.fetch awaits app.fetch inside a new max:1 pool; finally ends it. There is no application fetch waitUntil handler or Better Auth advanced.backgroundTasks.handler.
- Cron places the entire withRequestDatabase operation, including maintenance and pool close, inside waitUntil. Its services await database and storage operations.
- Better Auth 1.7.7 create-context.runInBackgroundOrAwait awaits callbacks when the handler is absent. Installed password/sign-up/sign-in/email-verification routes await that helper. The only installed direct runInBackground caller found is the unused phone-number plugin. Project hooks await audit/MFA writes.
- Authentication mail awaits the selected transport. Storage consumes streams before completion/DB updates. Public assets redirect to a signed URL; there are no database-backed streamed HTTP bodies or detached application database callbacks.
- Publishing uses the existing Drizzle transaction/client; no transaction implementation changed.
- pg-pool 3.14.0 emits pool error from makeIdleListener after removing an idle client. Querying an ended pool rejects its query instead of itself emitting that event.

### Initial gates (diagnostics, before shutdown fix)

Commands run from the independent checkout, using Bun 1.4.2. The first sandbox attempts could not resolve github.com, create local TCP sockets, or use Bun temporary storage; escalated local/network retries succeeded. These are environment restrictions, not failing product gates. Local PostgreSQL 18.6 was initialized under work/pool-investigation/pg-data with trust authentication on loopback only and a fresh folio_test database. Migrations ran only through the guarded test wrapper.

```text
bun install --frozen-lockfile
Checked 402 installs across 516 packages (no changes) [39.00ms]; exit 0
bun audit
No vulnerabilities found (checked 456 packages) [902.00ms]; exit 0
bun run typecheck
Types generated successfully; both API/web typechecks exit 0
bun run check
Checked 394 files in 104ms. No fixes applied.; exit 0
bun run test:web
37 pass; 0 fail; 685 expect() calls; 15 files; exit 0
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55432/folio_test bun run test
69 pass; 12 skip; 0 fail; 5207 expect() calls; 26 files; exit 0
Enforced MFA child: 11 pass; 0 fail; 308 expect() calls
bun run test:worker-storage
8 Workers storage regressions passed; no provider/database requests.; exit 0
bun run test:worker-mail
15 Workers mail checks passed; all outbound traffic mocked, no real email/database/provider request.; exit 0
bun run build
Generating static pages (49/49); exit 0
bun run --cwd apps/web build:cloudflare
OpenNext build complete.; Worker saved in .open-next/worker.js; exit 0
(cd apps/api && bunx wrangler deploy --dry-run --outdir ../../work/api-dry-run)
Total Upload: 4658.74 KiB / gzip: 830.89 KiB; --dry-run: exiting now.; exit 0
```

The 12 conditional skips are unchanged: eleven MFA tests run in the enforced child; one historical browser-fixture cleanup test is conditional. No tests were disabled or quarantined. Build warnings: Next notices the parent package outside this Git root; OpenNext emits Node punycode deprecation; neither gate failed.

### Local runtime evidence before fix

Ignored reproduction material is under work/pool-investigation; no real provider credentials were used. Commands actually executed:

```sh
initdb -D work/pool-investigation/pg-data -U folio --auth=trust --no-locale --encoding=UTF8
pg_ctl -D work/pool-investigation/pg-data -l work/pool-investigation/postgres.log -o '-h 127.0.0.1 -p 55432 -k /tmp -c logging_collector=off' start
createdb -h 127.0.0.1 -p 55432 -U folio folio_test
python3 work/pool-investigation/prepare.py
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_SEND_METRICS=false WRANGLER_WRITE_LOGS=false bunx wrangler dev --config work/pool-investigation/api.json --local --ip 127.0.0.1 --port 8787 --test-scheduled
python3 work/pool-investigation/exercise.py
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_SEND_METRICS=false WRANGLER_WRITE_LOGS=false bunx wrangler dev --config work/pool-investigation/probe.json --local --ip 127.0.0.1 --port 8788
python3 work/pool-investigation/probe.py
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_SEND_METRICS=false WRANGLER_WRITE_LOGS=false bunx wrangler dev --config work/pool-investigation/trace.json --local --ip 127.0.0.1 --port 8789
```

- Real Worker HTTP: signup/signin, site creation, profile save, transactional publish and public read all 200. Upload intent returned truthful 503 STORAGE_UNAVAILABLE; reset request returned truthful 503 MAIL_UNAVAILABLE. These two provider-success paths were not verified in that dev server. Cron via /__scheduled returned 200 and maintenance_completed with storage disabled. Exact disposable account cleanup: DELETE 1.
- Eight normal flow pool errors occurred, with Error/unknown/request/ending:true/ended:true. The first probe-result parser incorrectly counted only lines beginning with JSON; Wrangler decorates error lines with ANSI prefixes. Direct inspection found those events, and subsequent parsing must extract the JSON payload, not use startsWith. No zero-event conclusion is drawn from the incorrect initial parser.
- Twelve concurrent request scopes held twelve distinct pg_backend_pid values. A deliberately delayed query after scope completion rejected as an ended-pool query; it did not reproduce the same asynchronous failure mechanism.
- pg_sleep(20) rejected at 15008 ms with SQLSTATE 57014, without an idle pool error from that query. No timeout setting was changed.
- pg_ctl -m fast stop while Worker request/scheduled-labelled probe pools and a Bun shared pool were idle produced 57P01 with ending:false/ended:false in all three stages. The scheduled-labelled probe uses the scope's stage argument; real Cron was tested separately above. API /ready returned 503 while stopped and 200 after restart.
- Three minimal traced Worker requests each succeeded, then called local socket.end(), then rejected the pending pg-cloudflare _listen read. A WeakSet matched the exact error object from that rejection to database_pool_error; each event had ending:true/ended:true. No error message or stack was printed. This proves the local normal-shutdown mechanism independently of user work, mail, deadlines or server interruption.

### Cause assessment and design

The reproduced normal-flow cause is pg-cloudflare 1.4.1 closing a Cloudflare socket while its reader still has a pending read. That rejection is forwarded as a socket error through pg to the pool idle-error listener even after pool.end. It is a fifth mechanism, outside the four original hypotheses. [Cloudflare TCP socket documentation](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/) states that close forcibly closes both streams; installed pg-cloudflare source calls socket.close without first settling its reader.

- (a) No post-response application database work found; deliberate ended-pool use has a different failure path. Not a universal proof against all future/background code.
- (b) Forced server termination is distinguishable (57P01, pool not ending). Neon suspension itself is not verified.
- (c) Local statement timeout is a query rejection with 57014. Real hosted connect/read failures remain unknown.
- (d) Bun can emit real shared-pool idle shutdown errors, but normal-end errors were reproduced in actual workerd, so they are not exclusively Bun logs.

The initial proposed reader-cancellation approach was subsequently tested and rejected; the final design and its actual results follow below. No suppression based solely on pool flags, size/deadline tuning, auth change or pooling across requests is justified. Historical hosted event attribution still needs post-deployment evidence.

### Not verified

No deployment, hosted tail, Neon access/migration, provider request/account change, real mail delivery/upload, hosted TLS behavior or browser UI verification. API runtime testing used HTTP clients and local workerd, not a browser. The local reproduction proves a mechanism but cannot classify every historical name-only hosted event.


### Step 2: proven local shutdown fix

`bun info pg-cloudflare` returned latest 1.4.1, published 2026-09-30T15:38:46.171Z by the node-postgres maintainer. No new dependency or version upgrade was introduced. `bun patch pg-cloudflare@1.4.1` and `bun patch --commit node_modules/pg-cloudflare` produced the committed source/distribution patch and lockfile registration. An unrelated generated Bun marker was removed from the patch; the frozen install and final suite verify the final patch.

The fix uses writable.close() for normal end(), after the existing final-write callback, instead of forcibly aborting both streams with socket.close(). destroy() retains socket.close(). Errors are still forwarded by the existing catches. There is no lifecycle/severity-based error suppression, reconnect/retry, shared Worker connection, deadline/size change, schema migration, auth change or TLS setting change. Bun retains pg's existing Node socket implementation.

New files: patches/pg-cloudflare@1.4.1.patch, scripts/test-worker-database.ts, apps/api/tests/fixtures/worker-database.ts. Modified: package.json, bun.lock, scripts/test-api.ts and continuity/operations documentation. The test-only routes are not mounted by the application. The root guarded wrapper runs the workerd checks after the Bun suite; browser fixture modes retain their existing lifecycle. The script independently rejects remote/non-folio_test URLs before bundling/connecting.

#### Regression proof and rejected experiment

```text
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55432/folio_test bun run test
Before patch: Bun 69 pass / 12 skip / 0 fail; workerd assertion fails:
AssertionError: Successful request teardown must not emit a pool error
1 !== 0
exit 1
Reader-cancellation experiment: the same assertion still failed; exit 1.
That candidate was discarded, not committed as a solution.
Graceful writable-close patch: Bun 69 pass / 12 skip / 0 fail / 5207 assertions;
7 Workers database checks passed; local folio_test only; 12 concurrent clients isolated; real idle termination retained.
exit 0
```

The seven Worker checks cover: normal request close, same-client transaction, reusable connection after rollback, twelve distinct concurrent backends with clean close, actual scheduled handler/maintenance close, own-idle-backend termination preserving 57P01 while ending/ended are false, and clean recovery in a new request. Logs are captured by Miniflare and parsed from fixed JSON payloads, including decorated output. No error is suppressed by the harness.

The before assertion was added specifically to expose the reproduced defect; no existing failing gate was labelled pre-existing. The first diagnostic commit had passed every existing gate.

#### Repeated actual API runtime

A fresh wrangler dev --local --test-scheduled server on port 8790 used the final patch and the same isolated database. `python3 work/pool-investigation/exercise-after.py` repeated the ten HTTP cases. Signup/signin/create/save/publish/public/health were 200; disabled upload intent and reset returned their real 503 codes; Cron returned 200/maintenance_completed. Pool events dropped from eight before the fix to zero after the fix. Both exact disposable accounts were cleaned (DELETE 1 per flow); no credentials/cookies/native auth bodies were printed or persisted by the HTTP harness. A local pg_stat_activity count after the flow found zero other client connections to folio_test. Existing Workers mail regressions separately prove callbacks await a mocked provider; this is not real provider delivery.

#### Final gates

All eleven final gates ran after the final patch, with a clean process environment (no provider credentials) and no local env files. Full local logs: work/pool-investigation/final-*.log; structured exit results: final-gates.json. Exact result lines:

```text
bun install --frozen-lockfile
1 package installed [13.00ms]; exit 0 (final patch applied)
bun audit
No vulnerabilities found (checked 456 packages) [1.61s]; exit 0
bun run typecheck
Types generated successfully; both API/web typechecks exit 0
bun run check
Checked 396 files in 96ms. No fixes applied.; exit 0
bun run test:web
37 pass; 0 fail; 685 expect() calls; exit 0
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55432/folio_test bun run test
69 pass; 12 skip; 0 fail; 5207 expect() calls
Enforced MFA child: 11 pass; 0 fail; 308 expect() calls
7 Workers database checks passed; local folio_test only; 12 concurrent clients isolated; real idle termination retained.
exit 0
bun run test:worker-storage
8 Workers storage regressions passed; no provider/database requests.; exit 0
bun run test:worker-mail
15 Workers mail checks passed; all outbound traffic mocked, no real email/database/provider request.; exit 0
bun run build
Generating static pages (49/49); exit 0
bun run --cwd apps/web build:cloudflare
Generating static pages (49/49); OpenNext build complete.; exit 0
(cd apps/api && bunx wrangler deploy --dry-run --outdir ../../work/api-dry-run)
Total Upload: 4658.78 KiB / gzip: 830.90 KiB; --dry-run: exiting now.; exit 0
```

The API dry-run bundle contains the final this.destroyed ? socket.close() : this._cfWriter.close() branch. Existing conditional skips and benign build warnings are described above. Final documentation-only edits received a fresh Biome and git diff whitespace check before commit; no source changed after the full run.

Cleanup: all four local Wrangler dev servers were stopped; no pool-probe fixture users remained; PostgreSQL was stopped normally. Ports 55432/8787/8788/8789/8790 were verified closed. The ignored local data/logs remain inside work, not in Git.

### Human rollout and capture

The exact ordered API-only deployment and metadata-only tail commands are in [OPERATIONS.md, database pool error capture](OPERATIONS.md#database-pool-error-capture--2026-10-21). They are instructions for the human, not executed deployment evidence. No migration, new secret, provider provisioning or web deployment is required. All current real secrets remain untouched. The tail filter outputs only timestamp/event/name/code/stage/ending/ended, not raw Worker tail metadata. Keep approximate operation/time and deployed version with any recurrence; do not infer Neon suspension from a 57P01 alone.

### Remaining limits

Hosted historical events remain unclassified because their old payload had no code/stage/lifecycle. This fixes a directly reproduced normal-shutdown defect, not a claim that every historical occurrence had that cause. Neon autosuspend/TLS and provider/runtime behavior are not verified. Local database TLS negotiation was not exercised; the shared adapter end path changed, while TLS handshake/verification settings did not. The version-specific patch needs review on upgrades. No post-response application DB operation was found, but future detached work still must retain its scope. No browser UI test, actual email/R2 request, deployment or hosted tail was performed.

## Deterministic browser E2E acceptance — 2026-10-21

### Problem and design

Critical bilingual journeys previously had no committed browser regression gate. The human requested real locally built applications, isolated PostgreSQL, native authentication, publication privacy, ownership denials and CI artifacts; completion additionally requires three consecutive local passes and a green PR E2E job.

Work is confined to the independent GitHub checkout, branched from freshly fetched main ba37ac6 as codex/playwright-e2e. The initial checkout had local pool-investigation commits on another branch; they remain there and are not silently transplanted into main. The pre-existing untracked docs/ADMIN_CONSOLE_TASK.md was preserved.

The runner validates local folio_test before imports/migrations, supplies only explicit test configuration, creates a source-only Next staging directory with no environment files, builds production Next, starts the real Bun API and next start, waits on actual readiness and owns process cleanup. Real schema migrations are applied only to this disposable local database. The guarded fixture uses native Better Auth as the existing browser fixture does; no server bypass endpoint or fake UI/database state is introduced. Provider settings are absent. Browser egress is restricted to exactly127.0.0.1:4300/4400. Test-native verification semantics are preserved with the trial flag false. Existing rate budgets are allowed to expire by a bounded condition wait; they are never deleted or disabled.

### Files

- Root package.json/bun.lock: exact maintained @playwright/test1.64.1, test:e2e and E2E typecheck in the root typecheck gate.
- scripts/test-e2e.ts: guarded local orchestration, isolated build and owned-service teardown.
- apps/api/tests/fixtures/e2e-account.ts and its one-line e2e/seed.ts bridge keep Drizzle inside the API workspace.
- e2e/playwright.config.ts, tsconfig.json, fixtures.ts, seed.ts: Chromium, unique disposable identities, scoped verified deletion, real protocol helpers, network gate, no retries and failure artifacts.
- e2e/routing.spec.ts, journeys.spec.ts, language.spec.ts, guards.spec.ts, language.ts:43 checks and explicit notation/user-content exceptions.
- .github/workflows/check.yml: isolated PostgreSQL18 job, Node22/Bun1.4.2, matching Chromium, ten-minute timeout and seven-day failure HTML/screenshot/trace artifacts.
- docs/E2E.md, README.md, SOURCE_STRUCTURE.md, DEPENDENCIES.md, DECISIONS.md, CHANGELOG.md and STATUS.md: execution, design choices, actual acceptance and limits.

### Local runtime/browser evidence

PostgreSQL18.6 was initialized under ignored work/e2e-postgres and bound to loopback only. No hosted database, provider resource or real mailbox was used. Playwright1.64.1 uses Chromium revision1248. Three consecutive invocations of bun run test:e2e completed with these actual reporter lines:

```text
43 passed (27.6s)
43 passed (26.6s)
43 passed (27.0s)
```

The production web build completed49/49 pages on every invocation. Native signup/sign-out/sign-in/onboarding and persisted profile edits ran in both interface languages. A barrier held the real draft write while asserting the locale route had not changed; after release the other-language editor read the saved name. Public HTML and API retained the published name after a later private draft was persisted. Unpublication returned404 from both surfaces. Cross-owner read/preview/draft/address/publish/unpublish attempts returned403/404 and owner state remained equal. Four admin page gates and three protected API routes denied ordinary users in both languages.

Navigation sentinels/mutation observers proved the document survived landing/login/signup/privacy/terms/home without any loading-screen mount. Path/query/hash preservation, Back, server Arabic HTML and actual404 status assertions passed. Script checks covered20 public platform pages plus onboarding/studio sections/admin denial; two negative-control tests proved visible text, placeholder, aria-label and title violations are caught while aria-hidden artwork is excluded. The explicit allowlist covers proper names, formats, notation and known generated user content only. Three runner guards rejected a remote database, a wrong database and a connection-override query before any service started. /ready reported mail/storage disabled.

Raw logs and final HTML report remain ignored under work/e2e-evidence and work/e2e-report. Failed development attempts exposed ambiguous editor/preview locators, expected hero punctuation, documented proper-name/unit exceptions and a report directory resolved relative to the config. These harness issues were corrected without modifying product behaviour or weakening assertions. The save listener was also moved before field interaction to avoid missing early autosave on slow runners.

### Required quality gates — final clean-install command output

All commands ran from the independent checkout except the explicitly noted API directory. The gate launcher used a small environment (PATH/HOME/TMPDIR plus the local test URL and Wrangler dotenv/log/metrics disabling). No environment/secret file was opened, copied or committed.

```text
bun install --frozen-lockfile
398 packages installed [364.00ms]

bun audit
No vulnerabilities found (checked 459 packages) [686.00ms]

bun run typecheck
API tsc, web next typegen + tsc, and tsc --noEmit -p e2e/tsconfig.json: exit 0

bun run check
Checked 403 files in 106ms. No fixes applied.

bun run test:web
37 pass; 0 fail; 685 expect() calls

TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55433/folio_test bun run test
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

### Remote acceptance

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

The eleven gate commands above were repeated from the clean checkout (API TEST_DATABASE_URL used loopback port55433); exact raw output is in ignored work/e2e-evidence/clean-gate-*.log. Corrective remote acceptance is complete on69da0f1542a4745031127fef81cbf880a745539b. [Run39624159815](https://github.com/2ve2/FolioCraft/actions/runs/39624159815) completed successfully for all four jobs: validate119305071040, workers119305071147, integration119305070882 and e2e119305071125.

The actual E2E job log reports:

```text
2026-10-21T15:18:08Z Running 43 tests using 1 worker
2026-10-21T15:18:49Z 43 passed (41.1s)
```

The full job ran approximately2m08s (15:16:45Z setup through15:18:53Z cleanup), within the ten-minute target. Failure artifact upload was correctly not run on the successful job. The final follow-up commit records evidence and roadmap/status only; tested implementation/configuration bytes are unchanged.

### Human commands and unverified limits

Required provisioning, secret, migration or deployment commands: none. This adds test tooling only and changes no schema or application behaviour. The local setup commands in E2E.md are optional for rerunning the suite. Human review/merge is still required; this task never merges.

Not verified: real email or R2, image uploads (explicitly excluded; no placeholder skip), hosted persistence/authentication/cookie security, native staff MFA through Playwright, other browser/device engines, production performance or provider availability. The failure artifact uploader has not been forced to fail remotely; its actual path/configuration is reviewable and its report is generated locally. Traces contain disposable local session data, so retain them only for debugging. Scheduled/provider/production resources were not changed. Final cleanup: database query confirmed0 remaining generated E2E accounts, both owned application processes and both isolated PostgreSQL servers were stopped, and loopback ports4300/4400/55432/55433 were verified closed. Pre-existing untracked docs/ADMIN_CONSOLE_TASK.md is unchanged. The latest clean local HTML report is work/e2e-clean/work/e2e-report/index.html.

### Review hardening (after merging main)

A review mutation test found one weak assertion. Replacing `await flush()` with a non-awaited save in `use-studio-controller.ts` `setLocale` (so the language switch no longer waits for the save) still passed: the test read `page.url()` the moment the held PUT started, before the premature soft navigation could commit.

The check now requires `page.waitForURL` to the other language to time out during a 2-second window while the save is held, then asserts the URL is unchanged. Results: with the mutation, journeys 2 failed / 3 passed, both failures at the new assertion; with the real code, journeys 5/5 passed and the full suite 43/43 three consecutive times on the tree merged with main (local Chromium 141 through the same Playwright 1.64.1 runner; CI installs its pinned browser). Fixture cleanup verified 0 remaining `e2e-%` accounts.

## Owner monitoring — 2026-10-21/22

### Problem and authorized scope

The two trial Workers emit some sanitized events but have no established owner alerting. Add privacy-preserving error capture for both Workers, HTTP 5xx, Cron outcomes and release identifiers, plus externally operated uptime alerts. The human explicitly cancelled staging; no staging changes are part of this branch.

Branch: `codex/owner-monitoring`, based on freshly fetched `main` at `97bfd30`. Work is confined to the independent checkout. The pre-existing untracked `docs/ADMIN_CONSOLE_TASK.md` is excluded.

### Provider comparison (official sources checked 2026-10-21)

- **Cloudflare Workers Logs / Observability:** currently included on Free with 200,000 log events/day and three-day retention; Paid includes 20 million/month and seven days, then $0.60/million. Native structured console logs, runtime exceptions and invocation outcomes; low setup effort and no new SDK. Automatic invocation metadata includes request URLs, so simply enabling it does not meet the privacy requirement. Disable invocation logs and audit emitted fields before retention/export. Logs configuration alone does not establish delivery of an owner alert for every application failure. On December 1, 2026 Cloudflare changes to shared Observability pricing: Free includes 0.5 GB/day with seven-day retention and no additional ingestion option. Recheck before rollout. Sources: [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/), [new pricing](https://developers.cloudflare.com/observability/pricing/), [available notifications](https://developers.cloudflare.com/notifications/notification-available/).
- **Workers Logpush:** Workers Paid only (minimum Workers subscription $5/month); 10 million requests/month included, then $0.05/million, plus destination charges. Exports invocation/request metadata, logs and exceptions; requires a destination and separate alert configuration. Higher setup and privacy burden; not recommended for this friends trial. Source: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Logpush](https://developers.cloudflare.com/workers/observability/logs/logpush/).
- **Sentry:** Developer $0, one user, 5,000 errors/month and email notifications; Team advertised $26/month when billed annually with default prepaid data. Dedicated grouped application failures, release tags and issue notifications; explicit capture is needed for handled 5xx and Cron outcomes. Medium implementation effort: optional configuration, Worker-compatible SDK, local mock transport and a strict outgoing allowlist. SDK defaults must not be trusted to exclude all sensitive data. Disable request context, breadcrumbs, tracing, replay and automatic log forwarding; omit arbitrary error messages and user-supplied values. No browser SDK is needed for the requested Worker scope, which avoids exposing visitor IPs directly to a tracker and keeps browser CSP unchanged. Source: [official pricing](https://sentry.io/pricing/), fetched successfully using curl after the web reader rejected its content type. SDK compatibility is still to be checked before installation; no package installed at this checkpoint.
- **UptimeRobot:** Free supports commercial/business use, 50 monitors, five-minute checks, and email alerts. Low effort: human creates unauthenticated monitors with no cookies, request bodies, query tokens or credentials. Catches endpoint timeout, DNS/TLS/network failures and HTTP failures, including an outage of the application's own platform; does not diagnose code or prove database/auth/provider functionality. Detection is bounded by check interval plus confirmation/delivery latency, not a guaranteed five-minute notification SLA. Sources: [free plan eligibility and limits](https://help.uptimerobot.com/en/articles/11604710-who-should-use-uptimerobot-s-free-plan), [monitoring and alerts](https://uptimerobot.com/).
- **Better Stack uptime:** advertised Free for personal projects, 10 monitors/heartbeats, three-minute checks, Slack/email alerts. Faster free polling, but eligibility for this SaaS must be confirmed rather than assumed. Advertised paid responder starts $34/month or $29/month with annual billing. Similar public-endpoint privacy and functional limits to UptimeRobot; no automatic access to application content is needed. Sources: [pricing and eligibility wording](https://betterstack.com/pricing), [check intervals](https://betterstack.com/docs/uptime/check-frequency/).

**Original recommendation (subsequently selected by the human):** Sentry Developer for sanitized server-side errors plus UptimeRobot Free for independent uptime/email alerts. This provides explicit application-error notifications and external failure detection without a paid plan or an ambiguous personal-project eligibility assumption. Use separate logical API/web identifiers, 100% eligible error sampling within the free quota, no performance/replay data, and bounded alert repetition. Quota exhaustion, email delays and provider failures remain possible; no unlimited delivery guarantee. Optional Cloudflare log persistence should be considered separately after its privacy implications are resolved.

**Human choice:** Sentry Developer + UptimeRobot Free, selected before SDK installation. Additional human requirements: server-only/no CSP changes, no PII, real trial/release tags, no expected 4xx, no DSN outside Workers Secrets, no database-backed uptime checks, bilingual privacy disclosure/draft notice and manual provider setup. No account, real secret, deployment or live monitor was created.

### Initial existing-code observations

- API `src/worker.ts` owns fetch and scheduled boundaries. Hono handles errors internally, so a Worker exception wrapper alone misses handled 5xx.
- `apps/api/src/middleware/http.ts` already logs safe method/status/duration/request identifiers. `BUILD_VERSION` exists in API env, but actual deployment version metadata is not bound.
- Web deploys generated `.open-next/worker.js`; monitoring must wrap the generated entry without editing generated source and preserve OpenNext context/exports.
- API `/health` is a no-write liveness endpoint; `/ready` checks PostgreSQL. No web health route was found during initial inspection. Root locale redirects must be followed to a successful localized page in an external monitor.

### Commands and actual results so far

- `git fetch origin && git switch main && git pull --ff-only origin main && git switch -c codex/owner-monitoring`: completed; branch is `codex/owner-monitoring`, base `97bfd30`.
- Read AGENTS and required continuity/architecture/style/deployment/operations documents and inspected Worker manifests, request/error boundaries and Next/OpenNext configuration. No secret files were opened.
- Official web research completed as linked above. `curl -fsSL https://sentry.io/pricing/ -o work/monitoring/sentry-pricing.txt`: exit 0; pricing/free-email/5k-error entries verified in the public HTML. Third-party pricing summaries were excluded as evidence.
- Baseline source copied from `git archive HEAD` to ignored `work/monitoring/baseline`, excluding `.env*` and `.dev.vars*`; dependencies installed physically inside that copy. No local credentials copied.
- Baseline `bun --no-env-file install --frozen-lockfile`: exit 0, `398 packages installed [366.00ms]`. Two earlier sandboxed attempts failed with `EROFS accessing temporary directory`; rerunning the same frozen install with approved filesystem/network access succeeded. No lockfile change.
- Baseline API: `bun --no-env-file x --no-install wrangler deploy --config apps/api/wrangler.toml --dry-run --outdir work/api-baseline`, under a cleared environment with PATH/HOME and Wrangler dotenv/logging/metrics disabled: exit 0, `Total Upload: 4658.78 KiB / gzip: 830.91 KiB`, `--dry-run: exiting now.`
- Baseline web: `bun --no-env-file run --cwd apps/web build:cloudflare`, under the same cleared environment with the two explicit public trial origins and runtime API_URL: exit 0, `OpenNext build complete.` Existing Node punycode deprecation warning observed.
- Baseline web dry run: `bun --no-env-file x --no-install wrangler deploy --config apps/web/wrangler.toml --dry-run --outdir work/web-baseline`: exit 0, `Total Upload: 6963.77 KiB / gzip: 1374.16 KiB`, `--dry-run: exiting now.`
- Baseline logs remain under ignored `work/monitoring/baseline/work/`. These measurements are against unchanged main source, not a completed monitoring implementation. No deployment occurred.

### Implemented design and affected files

- Exact `@sentry/cloudflare@11.8.0` for the API and `@sentry/nextjs@11.8.0` for web. Registry metadata (`bun info`) confirms stable/latest, Node22.12+ compatibility (local22.22.2), Wrangler4 and Next14/15/16. The package lookup initially used misplaced global flags and returned Property not found; repeating the documented `bun info` form in the secret-free copy returned the actual metadata. Frozen lockfile is updated; existing OpenNext and pg-cloudflare patches are preserved.
- Official [Sentry Next.js-on-Cloudflare guide](https://docs.sentry.io/platforms/javascript/guides/cloudflare/frameworks/nextjs/) documents the supported Worker wrapper since11.6.0 and Next server onRequestError. It was fetched directly after the web reader rejected its content type. Existing nodejs_compat and compatibility date2026-10-14 exceed the documented2025-08-16 minimum. This is an actual supported integration, not an attempt to force the Node SDK into Workers.
- `packages/monitoring/src/index.ts` holds shared collection/sampling and beforeSend policy. SDK11 replaced sendDefaultPii: the explicit false policy is applied using dataCollection.userInfo=false, with cookies/headers/bodies/query/source variables/database/AI/GraphQL/queue content also disabled. Traces sample0, all spans ignored, logs/metrics dropped, no replay/profiling/default integrations/client reports. Eligible errors sample1. beforeSend rebuilds a finite allowlist; no free error messages, request paths, credentials, cookies, arbitrary extras, email/IP or draft content leave. Static bundle basename/numeric line/column only survive for grouping.
- SDK initialization/capture is bypassed without a valid Sentry cloud secret AND actual CF_VERSION_METADATA UUID. Both Wrangler manifests add only version metadata; web points to the custom wrapper. Trial origin vars, Cron schedule, security policy, database transaction/ownership and published-only/no-store policies are retained. DSN values are absent from manifests/repository; all fixture DSNs/versions are explicitly synthetic.
- `apps/api/src/lib/monitoring.ts` and `apps/api/src/worker.ts` cover exceptions, returned5xx and Cron failures; scheduled tasks now also return the registered Promise so failures reach capture. Cron success/failure console events include environment and actual version when supplied; success is not sent to Sentry and a missing Cron trigger is not monitored.
- `apps/web/worker.ts`, `apps/web/monitoring.ts` and `apps/web/src/instrumentation.ts` use the supported server-only boundary and Next hook without generated-source edits or withSentryConfig. Returned5xx is captured only if this invocation did not already capture the failure. `packages/monitoring/src/head.ts` uses a public per-event CloudflareClient/createTransport in a separate isolation scope for HEAD/OPTIONS, which automatic SDK fetch wrapping intentionally skips. Its bounded transport runs through waitUntil without changing the application response. No vendor patch was added.
- `apps/web/src/app/health/route.ts` is provider-free/no-write liveness. Uptime monitors remain exactly GET API/health and prerendered web/en; no readiness/portfolio/database query. `legal-copy.ts` names Sentry/UptimeRobot in both translations while retaining the draft warning; E2E adds only exact proper-name exceptions and explicit disclosure/draft checks.
- `apps/api/tests/monitoring.test.ts`, both test-only Worker fixtures and `scripts/test-worker-monitoring.ts` prove outgoing privacy, optionality and runtime capture. No fault endpoint is mounted in either production app. The CI Workers job runs the actual built-web mode after OpenNext build. `docs/MONITORING.md` contains the exact owner setup/silencing/release checklist; continuity/source/dependency/deployment/operations documents are reconciled.

### Local runtime and browser proof

- Final focused harness: **28 Workers monitoring checks passed; all ingestion mocked; no external provider/database traffic.** Both wrappers captured deliberate unhandled exceptions,500/503, Cron failure or the actual Next hook.400/401/403/404/422/429 and successful requests produced no error event. HEAD/OPTIONS failures and no-secret runs are covered; ingestion503 does not rewrite the app response or retry.
- Whole outgoing envelopes are inspected for planted cookies, Authorization, request bodies, token query strings, emails, IPv4/IPv6 and private portfolio text. beforeSend unit checks also cover future SDK fields, getters/serializers, missing/forged identity, non-error telemetry and stack source/context removal.
- Actual generated OpenNext is loaded in local workerd with assets and every outbound fetch intercepted. With DSN absent and with a synthetic DSN: /health and /en return200 with **zero API calls**, /en/does-not-exist returns404 with no event, and a mock API503 causes the real published-render failure to return500 and emit exactly one scrubbed error when enabled. This is a local fault fixture, not a hosted portfolio/monitor probe. Next's expected PUBLIC_RELEASE_UNAVAILABLE console trace appears during that deliberate fault.
- Browser production-build journeys include both single-language privacy pages, both provider names, retained draft notice, Arabic RTL, normal bilingual auth/studio/publication and publication isolation. Final complete-run evidence is recorded below. Browser chunks were scanned for internal SDK/ingest/trace/replay markers: zero hits. CSP source is byte-identical to main.

### Development failures and corrections (not hidden as pre-existing)

- Initial privacy type checks caught SDK11 option/API changes; the implemented policy uses the actual dataCollection/outgoing hooks rather than ignored legacy flags. A typed-array transport body needed an owned ArrayBuffer for current DOM typings. All were corrected before final acceptance.
- Initial local fixtures used a nonexistent Miniflare waitForIdle method and invalid scheduled-event metadata. Fixtures now drain their own registered background Promises deterministically and supply real Cron shape. The built-assets harness needed run_worker_first plus has_user_worker; an initial assertion also assumed one page/API read, overlooking metadata rendering. These were test-harness defects; the correct invariant is zero API calls for liveness and at least one intercepted call for the deliberate rendering fault.
- The HEAD/OPTIONS regression exposed stale last-event identity suppressing a later web5xx after per-event capture. The final code isolates that client and compares event identity before/after each web invocation. The ingestion-outage regression now passes.
- One formatter gate failed on the newly added harness indentation and was fixed. No failing product gate was labelled pre-existing. An automatic-approval-service quota failure stopped one runtime command on2026-10-21; it was not a safety rejection and no bypass occurred. The human requested continuation on2026-10-22, and the same mocked verification subsequently passed.
- Sandbox process/network isolation could not see the host test PostgreSQL. A restart attempt reported its existing lock; a host status check proved the original owned instance was already accepting connections. No lock removal, reset, data loss or hosted database access occurred.

### Final quality gates and bundle measurements

All final commands below ran on the isolated, physically installed source copy under `work/monitoring/current`, without environment files. PATH/HOME were retained; explicit public API/web trial URLs, NEXT_TELEMETRY_DISABLED=1, Wrangler dotenv/metrics/log-file disabling and only loopback TEST_DATABASE_URL were supplied. Source/config parity:491 non-Markdown files, zero mismatches. All fifteen checks exit0.

```text
bun install --frozen-lockfile
  Checked 448 installs across 601 packages (no changes) [14.00ms]
bun audit
  No vulnerabilities found (checked 539 packages) [794.00ms]
bun run typecheck
  API tsc, Next typegen/tsc and E2E tsc: exit 0
bun run check
  Checked 419 files in 101ms. No fixes applied.
bun run test:web
  37 pass; 0 fail; 685 expect() calls
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55432/folio_test bun run test
  75 pass; 12 skip; 0 fail; 5264 expect() calls
  Native enforced MFA child: 11 pass; 0 fail; 308 expect() calls
bun run test:worker-storage
  8 Workers storage regressions passed; no provider/database requests.
bun run test:worker-mail
  15 Workers mail checks passed; all outbound traffic mocked, no real email/database/provider request.
bun run build
  Generating static pages: 50/50; exit 0
bun run --cwd apps/web build:cloudflare
  Generating static pages: 50/50; OpenNext build complete.; exit 0
bun x --no-install wrangler deploy --dry-run --config apps/api/wrangler.toml --outdir <absolute-project-work>/gates/api-bundle
  Total Upload: 5130.08 KiB / gzip: 938.15 KiB; --dry-run: exiting now.
bun x --no-install wrangler deploy --dry-run --config apps/web/wrangler.toml --outdir <absolute-project-work>/gates/web-bundle
  Total Upload: 9695.11 KiB / gzip: 1996.45 KiB; --dry-run: exiting now.
bun run test:worker-monitoring --web-built
  28 Workers monitoring checks passed; all ingestion mocked; no external provider/database traffic.
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55432/folio_test bun scripts/test-worker-database.ts
  7 Workers database checks passed; local folio_test only; 12 concurrent clients isolated; real idle termination retained.
TEST_DATABASE_URL=postgresql://folio@127.0.0.1:55432/folio_test bun run test:e2e
  43 passed (30.4s)
```

The absolute outdirs above are `work/monitoring/current/work/gates/api-bundle` and `web-bundle` under the independent checkout. Full command arrays, exit codes and timings are in ignored `work/monitoring/current/work/gates/results.json`; output per command is alongside it. The user-requested `(cd apps/api && bunx wrangler deploy --dry-run --outdir ../../work/api-dry-run)` has the same config/build target; the verified invocation uses explicit config and absolute output to avoid Wrangler's config-relative outdir ambiguity. Existing12 conditional integration skips are unchanged; native MFA's separate enforced child actually passes11 tests. No test was disabled, skipped or quarantined for this feature.

Measured before/after against the same base and explicit public URLs:
- API:4658.78 to5130.08 KiB raw (+471.30 KiB);830.91 to938.15 KiB gzip (+107.24 KiB).
- Web:6963.77 to9695.11 KiB raw (+2731.34 KiB);1374.16 to1996.45 KiB gzip (+622.29 KiB).
- Web raw9.47MiB is approximately14.8% of64MiB, with approximately54.53MiB headroom. Its gzip1.95MiB is also below the older3MiB OpenNext guide figure. No size stop threshold is approached. Source maps are not uploaded. Dry runs do not measure hosted CPU/startup or prove a real deployment.

Official limit verification: [current Workers limits](https://developers.cloudflare.com/workers/platform/limits/) on2026-10-21/22 states64MiB uncompressed for Free/Paid and no compressed limit. Its Worker-size section says Total Upload is the applicable metric and gzip is informational. The [OpenNext overview](https://opennext.js.org/cloudflare) still mentions the older3MiB compressed Free limit; the current primary Workers page takes precedence. We record both raw and gzip sizes, and the prepared web bundle is also below that older boundary. Use an80% headroom warning threshold and stop if approached; no current bundle approaches either threshold. Hosted startup time/CPU eligibility remains unverified by dry runs.

### Known limits / not verified

No real Sentry organization/project/region or privacy/alert setting, DSN provisioning, hosted ingestion, quota entitlement, alert delivery/email latency, UptimeRobot account/contact/monitor, hosted cookie/auth/provider flow, deployment or production release has been verified or changed. The human must choose the data region and privately verify their own notification address/settings. No real alert recipient is invented or committed. No database migration or resource provisioning is needed.

The free error allowance can be exhausted; there is no durable retry queue or ingestion-outage alert. New-issue notifications are not an email for every repeated event. Uptime is300-second polling plus provider confirmation/delivery latency, not a guaranteed minutes-level SLA. Approved uptime probes intentionally do not detect database/auth/mail/R2 failures. Missing Cron execution/heartbeat, performance/tracing, browser-only errors, source-map uploads, production startup/CPU, backup restoration and live mail/storage remain outside verified scope. Existing console diagnostics are not exported by this feature; Cloudflare persistence/invocation logging is not enabled here.


### Operational documentation acceptance — 2026-10-22

Implementation commit: `2f69306 feat(monitoring): capture private server errors`. Branch `codex/owner-monitoring`; [PR5](https://github.com/2ve2/FolioCraft/pull/5) is open and unmerged. The operational runbook, source/dependency maps, Cloudflare/operations links and final continuity record form a separate documentation step. No source/configuration changed after the implementation commit.

Repeated all15 commands above before the documentation commit: every exit code is0. Frozen install:448 installs/601 packages, no changes [15.00ms]; audit:no vulnerabilities/539 packages [690.00ms]; Biome419 files/98ms/no fixes; API75 pass/12 unchanged conditional skips/0 fail/5264 assertions plus enforced MFA11/0/308; web37/0/685; storage8/8; mail15/15; Next/OpenNext50/50; monitoring28/28; database7/7; Chromium43 passed (36.1s). Typechecks and both dry runs exit0. API5130.08 KiB/gzip938.15; web9695.11 KiB/gzip1996.48. The web gzip rerun varies by0.03 KiB; raw size and limit comparison are unchanged. First implementation logs were preserved under `work/monitoring/implementation-gates`; latest per-command logs/results remain under `work/monitoring/current/work/gates`.

Cleanup after acceptance: local loopback folio_test query reports0 remaining generated E2E accounts; stopped only the owned PostgreSQL instance with pg_ctl fast stop; host-namespace socket checks confirm4300/4400/55432 closed. The unrelated untracked docs/ADMIN_CONSOLE_TASK.md is excluded and preserved. Remote PR checks started but were not yet complete when this record was prepared; local acceptance is not a claim about remote CI.

The exact ordered human setup/release commands are in [MONITORING.md](MONITORING.md). No actual DSN/email address, new resource, deployment, migration, hosted ingestion or notification delivery is part of this acceptance.

## Locale-prefixed routing and single-language pages — 2026-10-20

Context: after deploying `main` (PR 2ve2/FolioCraft#1) the human reported that moving between pages felt like a crash or a refresh, rejected an interim patch ("I want root fixes like other platforms"), and then reported pages that show Arabic and English at the same time. This work replaces the query-string interface language with language path prefixes and removes every place where one page mixed the two languages. Nothing was deployed; no hosted system, secret or provider was accessed.

Verification environment: Bun 1.4.2; local PostgreSQL 16 `folio_test` (ICU `en-US`); local production build (`next build` + `next start`) with the Bun API; Chromium 1194 through Playwright; OpenNext build served by `wrangler dev` (local workerd). QA scripts live in ignored `work/qa`.

### 1. Root cause of the "refresh" feeling

- Before: the interface language lived in `?lang=` and was read on the client (`useSearchParams`). Static platform pages were prerendered without a language, so every page first mounted a full-screen loading screen, restored the language on the client, then swapped in the real page. Each navigation therefore showed loading art, then content: a visible flash on every page change. This existed already at `5fee8f1`.
- Fix: the language is part of the path (`/ar/...`, `/en/...`), the way multilingual platforms usually do it. The server knows the language for every request, so pages are prerendered once per language with final text, `lang` and `dir`, and no language-restoration step exists anymore.

### 2. Routing design

- `apps/web/src/app/(platform)/[locale]/`: all platform pages (landing, auth, recovery, legal, studio, admin) moved here with `git mv`. Its layout prebuilds both languages (`generateStaticParams`, `dynamicParams = false`), renders `<html lang dir>` and supplies the language through `LocaleProvider`. Unknown prefixes such as `/fr/login` are 404.
- `lib/locale.ts`: `locales`, `defaultLocale = "en"`, cookie name `ichnara-locale`, `localeHref`, `splitLocalePath`, `negotiateLocale` (Accept-Language with q-values).
- `lib/locale-redirects.ts` + `next.config.ts` `redirects()`: un-prefixed URLs (`/` and the ten platform page roots) are redirected with static rules evaluated by the Next/OpenNext router, first match wins: legacy `?lang=ar|en` (old links and emails), then the saved `ichnara-locale` cookie, then a browser whose first language is Arabic, then English. Query strings are kept, so reset/verification tokens in old emails still work. All redirects are temporary (307).
- A Node `proxy.ts` was tried and rejected: OpenNext reports Node middleware as experimental on Cloudflare. Config redirects need no runtime code.
- `lib/use-interface-locale.tsx`: `useInterfaceLocale()` reads the provider and switches language with `router.replace` to the same page, query and hash under the other prefix (a soft navigation). On un-prefixed pages (portfolio and unmatched URLs) it saves the choice in the cookie and refreshes in place. `useRoutePath()` returns the path without its prefix for menus.
- All internal links (65) use `localeHref(locale, path)`. Auth callback URLs, recovery emails and the published-portfolio badge use the prefixed form.
- The `ready`/`localeReady` gating was deleted from every screen; `LoadingScreen` always renders its localized text.
- `apps/api/src/lib/auth/mail-templates.ts`: the email language comes from the callback path prefix, with the legacy `?lang` as fallback (new test in `apps/api/tests/mail-templates.test.ts`).
- `app/robots.ts` disallows `/admin`, `/ar/admin` and `/en/admin`.

### 3. Pages that mixed Arabic and English (fixed)

Found with `work/qa/mixed-crawl.mjs`, which loads every platform page in both languages (anonymous pages plus the signed-in studio and twelve admin pages) while the cookie and `Accept-Language` deliberately ask for the *other* language. It reports visible text, placeholders, labels and the document title written in the other script.

| Finding | Fix |
| --- | --- |
| Public portfolio error page showed both languages at once ("تعذر تحميل الموقع · Portfolio unavailable") | `p/[slug]/error.tsx` renders one language from the provider; the portfolio layout uses the release language, or the visitor's language when the release cannot be read |
| Browser tab title in English on 11 Arabic pages (recovery, legal, admin staff/requests/reports and their details) | `lib/locale-metadata.ts` `localizedMetadata({ ar, en })`, used by each page's `generateMetadata` |
| A 404 under `/en/...` rendered Arabic for an Arabic browser or cookie (language came from the visitor, not the URL) | `[locale]/[...missing]/page.tsx` calls `notFound()` so `[locale]/not-found.tsx` renders in the URL's language |
| Global and portfolio 404 titles were always English | localized `generateMetadata` (global) and a language-neutral `404` (portfolio) |
| Arabic logo label "إيكنارا — Ichnara" (screen readers read both) | Arabic label is "إيكنارا" (brand and loading screen; `tests/brand.test.tsx`) |
| Studio preview bar showed the retired name `folio / <slug>` | shows the real public path `/p/<slug>` |
| Switching language on a missing-portfolio 404 would have navigated to a non-existent `/en/p/...` | un-prefixed pages save the choice and re-render in place |

Final crawl result: no other-language text on any platform page except user content (the fictional account's own bio, "Visit") and the studio preview of an Arabic portfolio inside the English studio, which is intended (the preview carries its own `lang="ar" dir="rtl"`; portfolio language is a draft setting independent of the interface language).

### 4. Verification evidence

- Server HTML: `/ar/login` contains `<html lang="ar" dir="rtl">` and the Arabic heading, no loading screen and no English heading.
- Redirects (`next start` and local workerd, identical): `/` with `ar-SA` → `307 /ar`; with `en-US` → `307 /en`; `/login?lang=en` → `307 /en/login?lang=en`; `/reset-password?lang=ar&token=abc` → `307 /ar/reset-password?lang=ar&token=abc`; `/studio` with cookie `ar` and English browser → `307 /ar/studio`; `/fr/login` → 404; `/p/<slug>` → 200 (not redirected).
- Browser navigation (`work/qa/locale-qa.mjs`): first load `/ar` and soft client navigations landing → login → signup → privacy → terms → home all kept `lang="ar"`, with zero loading screens (`loadingSeen: 0`); switching to English on `/ar/login` → `/en/login` without a loading screen; Back returns to `/ar`; `/ar/does-not-exist` shows the Arabic 404; switching language in the studio saves the pending edit first (saved role equals the typed value).
- Portfolio error page with the API stopped (`work/qa/portfolio-down.mjs`): English browser → English only, title "Ichnara"; Arabic browser → Arabic only, title "إيكنارا"; Arabic cookie with English browser → Arabic only; the visitor's saved cookie is not overwritten by a portfolio page.
- Local workerd (OpenNext build): the redirect table above, `/ar/login` Arabic title, `/en/privacy` "Privacy notice — Ichnara", `/fr/login` 404 with Arabic title for an Arabic browser.
- Gates: typecheck exit 0; Biome 392 files, 0 issues; web 37 pass / 0 fail / 685 assertions; guarded API 66 pass / 12 skip / 0 fail / 5143 assertions; Workers storage 8/8; Workers mail 15/15; `next build` and OpenNext build exit 0 without the Node-middleware warning.

### 5. Known limits (not hidden)

- A hard-loaded 404 *inside* a matched route (`/en/no-such-page`, `/p/<missing>`) is served by Next.js 16.4 as its minimal error document, then rendered by the client in the correct language. This is the framework's `notFound()` behaviour (the missing-portfolio page already behaved this way before this work); soft navigations are unaffected. Unmatched prefixes (`/fr/...`) still get the fully server-rendered global 404 in the visitor's language.
- Opening the studio still shows the loading screen while the account and site are fetched; that is data loading, not language restoration.
- The Arabic-browser redirect rule checks the first listed language only; deeper preferences fall back to English. The cookie overrides it after the first visit.
- Not verified on the hosted trial: nothing was deployed.

## Audit fixes — 2026-10-20

Source: the read-only architecture/security audit of commit `5fee8f1` (report delivered to the human in chat). The human authorized implementing the fixes on branch `claude/modest-davinci-osg31w` and requested `@paralleldrive/cuid2` for identifiers. The Cloudflare deployment is a friends-only trial on a temporary domain; this work does **not** deploy, touch Neon/R2/Resend, or read secrets.

Verification environment for every step: Bun 1.4.2; local PostgreSQL 16 cluster under ignored `work/pg`, database `folio_test` created with an ICU `en-US` collation to match the CI container's locale behaviour. All integration tests run through the guarded root wrapper (`bun run test`).

### 1. Byte-wise account keysets (commit `5a277eb`)

- Problem: CI run 39401052793 failed `directory keysets traverse equal creation dates…`. The directory ordered mixed-case Better Auth ids with the database collation, while the test (and any client) compares in code-unit order. PostgreSQL ICU `en-US` sorts `aB, Ab, ac`; JavaScript sorts `Ab, aB, ac`.
- Change: `apps/api/src/db/keyset.ts` (`binaryText`, `afterText`), used by the account directory and staff list.
- Evidence: before the change the single test failed 2 of 15 local runs; after it, 0 of 20. Full suite: 57 pass / 12 skip / 0 fail / 3000 assertions; enforced-MFA child 11 / 308.

### 2. cuid2 identifiers

- Change: `packages/contracts/src/ids.ts` (`newId`, `idSchema`); Better Auth `advanced.database.generateId`; Drizzle schema `uuid` → `text` with `$defaultFn(newId)`; reviewed migration `0008_cuid2_text_ids.sql`; all API validators, request ids, audit correlation ids and web content-item ids use the shared helpers; text-id keysets (sites, data requests, reports) order byte-wise.
- Migration proof (one-off local script against a fresh `folio_mig_proof` database): migrated to 0007, inserted a legacy user/site/release/asset/inquiry with UUID ids and a snapshot referencing a UUID asset, applied 0008. Result: `{"identical":true,"allText":true,"types":13,"fks":[6 recreated],"immutableTrigger":true,"sameSiteFk":true,"cascade":true}` — values and JSON are byte-identical, the release immutability trigger and same-site publication FK still reject invalid updates, and account deletion still cascades.
- New tests: `apps/api/tests/identifiers.integration.test.ts` (2000 unique cuid2 ids; legacy UUIDs accepted; malformed ids rejected; new user, session and site ids are cuid2; legacy-UUID and malformed paths return 404). Updated: request-id format assertion and migration count (9).
- Found and fixed during verification: `scripts/backup-db.ts` inserted an `admin_audit` row relying on the removed database default; it now supplies `newId()`.
- Checks: typecheck 0; Biome 364 files 0; web 31 pass; guarded API 59 pass / 12 skip / 0 fail / 5022 assertions; MFA child 11 / 308; `db:verify-restore` restored 12 tables; `test:worker-storage` 6/6; `test:worker-mail` 15/15; `next build` compiled; API Workers dry-run 4644 KiB / 827 KiB gzip; `bun audit` clean.
- Not done: no migration was applied to Neon. Applying 0008 to the trial database is a separate, human-authorized step (`bun run db:migrate` against the trial `DATABASE_URL` after a backup).

### 3. Web security headers

- Problem: the Next.js web app sent no CSP, framing or HSTS headers (no `headers()` or proxy), so `/studio` could be framed for clickjacking.
- Change: `apps/web/src/lib/security-headers.ts` applied to every route from `next.config.ts`, following the Next 16 "without nonces" CSP guide (nonces would force all static pages to render per request). Policy: `default-src 'self'`; scripts/styles `'self' 'unsafe-inline'` (Next hydration and React inline styles); images and `connect-src` limited to the app, the API origin and `*.r2.cloudflarestorage.com` (presigned uploads/previews); `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`; plus `X-Frame-Options: DENY`, `nosniff`, `strict-origin-when-cross-origin`, a restrictive `Permissions-Policy` and `COOP: same-origin`. `upgrade-insecure-requests` and HSTS (`max-age=31536000`, no `includeSubDomains` because the trial apex hosts unrelated subdomains) apply only when `NEXT_PUBLIC_WEB_URL` is HTTPS; `'unsafe-eval'`/`ws:` only in development.
- Tests: `apps/web/tests/security-headers.test.ts` (2 cases). Web suite 33 pass.
- Browser evidence (local production build `next start` + Bun API on `folio_test`, Chromium 1194, fictional seeded account and published Arabic portfolio): `/`, `/login`, `/signup`, `/forgot-password`, `/studio`, `/p/<slug>`, `/p/<slug>/projects/<id>` all returned 200 with the CSP and `X-Frame-Options: DENY`, **0 CSP violations and 0 console errors**; the authenticated studio rendered the seeded workspace; a cross-origin page embedding `/studio` in an iframe was refused by the browser.
- Not verified: presigned R2 upload/preview under the CSP against real R2 (no provider access in this environment) — the R2 wildcard is in `img-src` and `connect-src` for that path.

### 4. Server-rendered language and direction for published portfolios

- Problem: the single root layout hard-coded `<html lang="en" dir="ltr">`; Arabic portfolios set `dir` only on an inner element, so screen readers and search engines saw English/LTR documents.
- Change: two root layouts via route groups. `(platform)` keeps the existing layout for landing, auth, studio and admin; `(portfolio)/p/[slug]/layout.tsx` renders `<html lang dir>` from the published release locale. `_public.tsx` wraps the public read in React `cache()`, so layout, `generateMetadata` and page share one API request. `global-not-found.tsx` (Next 16 `experimental.globalNotFound`, the documented approach for multiple root layouts) keeps the branded 404 for unmatched URLs. Shared font/CSS imports live in `root-styles.ts`. Files moved with `git mv`; relative imports were rewritten mechanically and type-checked.
- Evidence (local `next start` + Bun API on `folio_test`, fictional Arabic and English portfolios): Arabic `/p/<slug>` returns `<html lang="ar" dir="rtl">`, English returns `lang="en" dir="ltr"`; one API request per portfolio page view (was two: metadata and page); `/p/does-not-exist`, `/nope`, `/admin/nope`, `/studio/nope` all return 404 with the branded page in Chromium.
- Deployed-runtime evidence: `bun run --cwd apps/web build:cloudflare` (OpenNext) succeeded and `wrangler dev` (local workerd) served `/`, `/login`, `/studio` 200, `/nope` 404, the Arabic portfolio with `lang="ar" dir="rtl"`, the missing portfolio 404, and the CSP/X-Frame-Options headers.
- Checks: typecheck 0; Biome 369 files 0; web 33 pass.
- Note: moving between `/p/*` and platform routes is a full page load (different root layouts); the only such link is the "Visit Ichnara" badge, already a plain anchor.

### 5. Visible keyboard focus

- Problem: form fields removed the outline and showed only an ~8%-opacity shadow; the shared button/link/select focus colour `#a890e8` measured 2.69:1 on white, below the WCAG 2.2 3:1 non-text contrast minimum.
- Change: `--focus-ring: #7c5cd6` in `styles/tokens.css` (4.82:1 on white, 4.45:1 on `#f7f5fb`); fields get a 2px `:focus-visible` outline, buttons/links/select trigger and focused options use the token. Mouse focus styling is unchanged.
- Evidence (Chromium, local production build, `/login`): tabbing reports `outline: solid 2px rgb(124, 92, 214)` on the password field and `3px` on the submit button and links; screenshot reviewed.

### 6. Owner-supplied outbound links

- Problem: public portfolio links to owner-supplied URLs carried `noopener noreferrer` but not `ugc nofollow`, inviting link-spam signups on the platform domain. Audit correction: the audit also flagged `website` as bypassing `safeHttpUrl`; `portfolio.tsx` already sanitizes it before passing it down, so that part was defence-in-depth only.
- Change: `packages/portfolio/src/external-link.tsx` renders every owner link (website, social links, project links, education verification) with HTTP(S)-only `href`, `target="_blank"` and `rel="ugc nofollow noopener noreferrer"`, returning nothing for unsafe targets. Five hand-written anchors replaced.
- Tests: `apps/web/tests/portfolio-links.test.tsx` (all new-tab anchors carry the rel; `javascript:`/`data:` targets never render). Web 34 pass; guarded API 59 pass / 0 fail.

### 7. Server-error status when a published release cannot be read

- Problem: when the API was unreachable, public portfolio pages rendered "Portfolio unavailable" with HTTP 200, invisible to uptime checks and indexable as content.
- Change: pages call `releaseUnavailable()`, which throws during render; `(portfolio)/p/[slug]/error.tsx` shows the same bilingual message plus a retry button. A release switch between the site and detail reads is treated the same way.
- Evidence (local production build, API stopped): `/p/<slug>` and `/p/<slug>/projects/<id>` return **500** with `<meta name="robots" content="noindex">`, and Chromium renders the bilingual message; with the API running the same URL returns 200.
- Limit: Next.js page rendering cannot choose 503 specifically; 500 is the achievable server-error status without an extra proxy layer. The audit's "503" recommendation is therefore met as "5xx + noindex".

### 8. CI builds what is deployed

- Problem: CI ran `next build` (Turbopack) while deployment uses OpenNext with webpack, and never ran the Workers-runtime regressions, the API Worker bundle or `bun audit`; `actions/checkout@v4` triggered the Node 20 deprecation warning.
- Change (`.github/workflows/check.yml`): new `workers` job (`test:worker-storage`, `test:worker-mail`, API `wrangler deploy --dry-run`, `build:cloudflare`); `bun audit` in `validate`; `actions/checkout@v5`; read-only `permissions`; `concurrency` cancels superseded runs. Integration job unchanged (PostgreSQL 18 service).
- Local evidence for every new step: audit clean (498 packages); storage 6/6; mail 15/15; API dry-run 4644 KiB / 827 KiB gzip; OpenNext build exit 0 with default (unset) public URLs. Remote GitHub Actions execution of the new job is not yet observed (push access pending).

### 9. Draft legal pages

- Problem: no privacy notice, terms or content policy, while the product stores account, session (IP/user agent), visitor-message and report data.
- Change: `/privacy`, `/terms`, `/content-policy` (Arabic and English) from `features/legal/legal-copy.ts`, rendered by `features/legal/legal-page.tsx`; linked from the shared product footer (new "Legal" column) and from an agreement line on the signup form. Every page shows a visible **draft** notice and the draft date.
- Content was written from the code, not assumptions: password hashing, session IP/user agent, drafts and all published versions, uploaded images, visitor messages, reports with a salted IP hash (never the raw IP), hashed rate-limit counters, staff audit log; only essential auth cookies and no analytics/trackers/browser storage (verified: no `localStorage`/`sessionStorage`/analytics in the web source); providers Cloudflare, Neon and Resend. Unknowns are stated as unknowns: retention periods, official contact channel and governing law are "to be defined before the public launch".
- Evidence (Chromium, local production build): all three pages plus `/signup` return 200 at 1280 px and 390 px in Arabic and English, correct `dir`, no horizontal overflow, no console errors, three legal links in the footer; screenshots reviewed (consent links underlined; Arabic date rendered LTR).
- Owner action: legal review of the wording, a contact address, retention periods and governing law before public launch.

### 10. Single-language authentication emails

- Problem: verification and reset emails mixed English and Arabic in one subject/body, with no `lang`/`dir`, and the sender had no display name.
- Change: `apps/api/src/lib/auth/mail-templates.ts` builds Arabic or English subject, text and HTML (`<html lang dir>`, accessible button, plain-link fallback, escaped account name). The language comes from the `lang` the web app already puts in the native link's `callbackURL`; anything else falls back to English. Sender is `Ichnara <MAIL_FROM>`. Link-origin validation, redaction, timeouts and native anti-enumeration behaviour are unchanged.
- Tests: `apps/api/tests/mail-templates.test.ts` (locale detection incl. fallbacks; Arabic RTL/English LTR; no mixed language; HTML escaping). `test:worker-mail` 15/15 (sender assertion updated). Both templates rendered in Chromium and reviewed.
- Not verified: real mailbox rendering in Gmail/Outlook and inbox placement (no provider access); the display name may improve recognition but deliverability still depends on the domain's SPF/DKIM/DMARC records.

### 11. Release retention

- Problem: every publish stored a full immutable snapshot (up to ~1 MB) with no limit, so storage grew without bound and could be exhausted deliberately.
- Change: `RELEASE_RETENTION = 50` in `services/sites/release-service.ts`; after a new release becomes active, older releases beyond the newest 50 are deleted in the same transaction. Re-publishing an existing revision reuses its release and prunes nothing. Rollback to any of the 50 retained releases keeps working.
- Test: `apps/api/tests/release-retention.integration.test.ts` (55 seeded + 1 published → exactly 50 kept; new release active; the six oldest removed; idempotent re-publish).

### 12. Scheduled maintenance and R2 cleanup after account removal

- Problem: `rateLimitService.cleanup()` existed but was never called; expired sessions, verification rows, Better Auth rate-limit rows and abandoned uploads accumulated; removing an account cascaded database rows but left its R2 objects forever.
- Change: migration `0009_storage_deletions.sql` (queue of R2 prefixes with a CHECK that only allows `staging/<id>/…`/`verified/<id>/…`); `services/maintenance.ts` (bounded jobs, injectable storage for tests); `storage.listKeys`; API Worker `scheduled` handler with a daily Cron Trigger; `bun run --cwd apps/api maintenance`; account removal queues the removed sites' prefixes after the native removal succeeds (keys are collected first; a queue failure is logged because the account is already gone).
- Tests: `apps/api/tests/maintenance.integration.test.ts` (only expired rows removed, live session kept; abandoned upload retired while fresh pending and ready assets stay; queued objects deleted, unrelated keys kept; provider failure keeps the prefix with `attempts = 1`; storage disabled still runs DB jobs; dangerous prefixes rejected by the database). The account-removal test now asserts both prefixes are queued. `admin-operations` derives the expected migration count from the Drizzle journal instead of a hard-coded number. `test:worker-storage` gained two `ListObjectsV2` cases (8/8, no DOMParser).
- Workers runtime evidence: `wrangler dev --test-scheduled` against local `folio_test`; `GET /__scheduled` logged `{"event":"maintenance_completed",…,"storage":"disabled"}` from workerd.
- Full suite: 65 pass / 12 skip / 0 fail / 5137 assertions; MFA child 11/308.
- Separate observation (pre-existing, not changed here): in local `wrangler dev`, a `/ready` request logs `{"event":"database_pool_error","name":"TypeError"}` while still returning 200; the original commit `5fee8f1` logs the same line. Worth investigating with Workers logs after deployment.

### 13. Data export includes the subject's portfolio content

- Problem: the owner-only data-request export (recorded as open item P6.54) excluded drafts and release snapshots, so it omitted the user's main content.
- Change: export `schemaVersion: 2` adds each owned site's current `draft` and its active `publishedRelease` (`id`, `revision`, `createdAt`, `snapshot`). Older releases (up to 50, potentially large), uploaded image bytes/R2 keys, credentials, sessions, audit, reports and backups stay excluded and are listed in `exclusions`. Existing row/byte caps still apply (`413 REQUEST_EXPORT_TOO_LARGE`). Admin UI description updated in both languages.
- Test: `data-requests.integration.test.ts` now publishes a marked release for the subject and asserts the draft and active snapshot are exported while another user's draft, messages and credentials never appear. Full suite 65 pass / 0 fail.

### 14. Unused styling dependencies removed

- Problem: Tailwind CSS (+ `@tailwindcss/postcss`) was imported but no utility class was used; `clsx`, `class-variance-authority` and `tailwind-merge` had zero imports. Tailwind also emitted a stray utilities layer from incidental source words (e.g. `.fixed`, `.hidden`), none used as a class name.
- Change: the only behaviour Tailwind provided — its preflight reset — now lives in `apps/web/src/styles/reset.css`, copied from the compiled 4.3.3 output into the same `base` cascade layer (MIT attribution in the file; the `hidden`-attribute `!important` is intentional and documented). Removed the five packages and `postcss.config.mjs`.
- Evidence: 22 full-page Chromium screenshots (11 routes incl. signed-in studio, Arabic/English portfolios, project detail, legal and 404 pages × 1280/390 px) are **pixel-identical** before and after (PIL difference bounding box empty for all). Main stylesheet chunk 61,523 → 58,445 bytes (13,077 → 12,386 gzip). Installed/audited packages 498 → 456; `bun audit` clean. Typecheck, Biome, web 34 tests and the OpenNext build pass.

### 15. Generated `next-env.d.ts` no longer tracked

- Problem: the tracked file was rewritten by every dev/build run (its imports switch between `.next-qa/dev/types` and `.next-qa/types`), leaving the tree dirty; earlier status notes repeatedly excluded it by hand.
- Change (per the bundled Next 16 TypeScript docs): `next-env.d.ts` added to `.gitignore` and removed from Git; the web `typecheck` script runs `next typegen && tsc --noEmit`, which regenerates the file and route types first.
- Evidence: with `next-env.d.ts`, `.next` and `.next-qa` removed, `bun run typecheck` regenerates the types and passes; a subsequent build leaves `git status` clean.
