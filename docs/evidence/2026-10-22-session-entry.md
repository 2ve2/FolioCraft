# Signed-in entry and tab-return session checks — 2026-10-22

Context: after PR 2ve2/FolioCraft#9 the human reported three things on the hosted trial: (1) a loading page before the product page when opening the site, (2) a sudden loading page after switching to another browser tab and back, and (3) the bare address showing the product page although they were signed in ("shouldn't it open the studio directly?"). Hosted behaviour could not be observed from this session (network policy blocks lord2ve.tech); everything below is local. Nothing was deployed.

Verification environment: Bun 1.4.2; local PostgreSQL 16 `folio_test`; local production build (`next build` + `next start`) with the Bun API; Chromium 1194 through Playwright (`work/qa/loading-probe.mjs`, ignored).

## 1. Loading page before the product page — not reproduced on `main`

- The product page (`/ar`, `/en`) contains no loading screen since PR 2ve2/FolioCraft#2; the probe recorded zero loading-screen frames when opening `/` and `/ar`, signed in or not.
- The language-restoring loading screen existed before PR 2ve2/FolioCraft#2. Unknown: which web version runs on the trial. If the bare address does not become `/ar` or `/en` there, the trial web Worker predates that change and needs a redeploy.
- Opening the studio still shows a loading screen while account and site data load; that is the optional studio first-load task, not this change.

## 2. Loading page after returning to the tab — root cause and fix

- Better Auth 1.7.7 (`client/session-refresh.mjs`, `session-atom.mjs`) re-fetches `/get-session` on every `visibilitychange` to visible (rate-limited to once per 5 s). On failure it keeps the known session (`data`) and sets `error`.
- The studio, administration shell, administrator security and sign-in screens treated any `error` as fatal, so a failed re-check replaced the open workspace with the full-screen "could not verify sign-in" screen. On the trial a slow or failed API/database response (for example Neon waking from scale-to-zero) triggers exactly this after a tab switch.
- Reproduced locally: studio open, `get-session` forced to 503, simulated tab return → loading screen with "تعذر التحقق من تسجيل الدخول" and a retry button.
- Fix: `lib/use-account-session.ts` wraps `authClient.useSession()` and reports `error` only while no session is known. An expired session is still rejected by the API on the next request (existing 401 handling).
- After the fix the same probe records no loading screen and the studio stays open.

## 3. Signed-in visitors and the bare address

- The session cookie is host-only on the API origin (`api.lord2ve.tech`, decision 2026-10-20), so the web router cannot see it. Changing its Domain or SameSite was not considered (requires explicit human approval).
- Fix: screens that already read the session keep a non-secret hint cookie `ichnara-signed-in=1` (web origin, `path=/`, `SameSite=Lax`, `Secure` on HTTPS, expires with the session; dropped when the API confirms there is no session). It holds no identity and is not a credential.
- `localeRedirects()` sends `/` with the hint to `/<locale>/studio` before the product-page rules, in the same language order (legacy `?lang`, language cookie, Arabic-first browser, English). `/ar` and `/en` still show the product page to signed-in visitors; other un-prefixed rules are unchanged.
- A stale hint (session expired elsewhere) reaches the studio, which redirects to sign-in and drops the hint.
- Privacy notice (both languages) now lists the language-preference and signed-in cookies; draft date 2026-10-22.

## 4. Verification evidence

- Redirects (`next start`): hint + Arabic browser `/` → `307 /ar/studio`; hint + language cookie `en` + Arabic browser → `307 /en/studio`; no hint → `307 /ar`; hint on `/ar` → 200; hint on `/login?lang=ar` → `307 /ar/login?lang=ar` (unchanged).
- Browser probe: signed-in visit to `/ar` sets the hint (value `1`, 7 days, not HttpOnly); `/` then opens `/ar/studio`; `/ar` stays on the product page; after sign-out the hint is gone and `/` shows `/ar`; a stale hint on an English browser ends at `/en/login` with the hint dropped.
- New `e2e/session.spec.ts` (3 tests) passes; reverting the error masking makes the tab-return test fail (mutation check), then restored.
- Gates: typecheck exit 0; Biome 453 files, 0 issues; web 43 pass / 0 fail; full Playwright suite 44/44 before the new spec and the new spec 3/3. Local Playwright used the installed Chromium 1194 mapped to the build name expected by `@playwright/test` 1.64.1.

- CI follow-up: the first CI run failed the tab-return test at sign-in because the full suite exhausts the native sign-in budget (10 per minute per address, all local requests share one loopback address). The spec now signs in through the real API and, on 429, waits for Better Auth's `X-Retry-After` window; the limit is not weakened. Full local suite afterwards: 47/47 passed (2.4 min, including the wait).

## 5. Known limits

- Not verified on the hosted trial. The first visit after signing in on a new device still shows the product page once until a screen confirms the session and stores the hint.
- If the API stays unreachable, the open studio keeps working until its next save, which then reports the existing "service unavailable" message.
