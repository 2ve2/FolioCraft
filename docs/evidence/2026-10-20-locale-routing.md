# Locale-prefixed routing and single-language pages — 2026-10-20

Context: after deploying `main` (PR 2ve2/FolioCraft#1) the human reported that moving between pages felt like a crash or a refresh, rejected an interim patch ("I want root fixes like other platforms"), and then reported pages that show Arabic and English at the same time. This work replaces the query-string interface language with language path prefixes and removes every place where one page mixed the two languages. Nothing was deployed; no hosted system, secret or provider was accessed.

Verification environment: Bun 1.4.2; local PostgreSQL 16 `folio_test` (ICU `en-US`); local production build (`next build` + `next start`) with the Bun API; Chromium 1194 through Playwright; OpenNext build served by `wrangler dev` (local workerd). QA scripts live in ignored `work/qa`.

## 1. Root cause of the "refresh" feeling

- Before: the interface language lived in `?lang=` and was read on the client (`useSearchParams`). Static platform pages were prerendered without a language, so every page first mounted a full-screen loading screen, restored the language on the client, then swapped in the real page. Each navigation therefore showed loading art, then content: a visible flash on every page change. This existed already at `5fee8f1`.
- Fix: the language is part of the path (`/ar/...`, `/en/...`), the way multilingual platforms usually do it. The server knows the language for every request, so pages are prerendered once per language with final text, `lang` and `dir`, and no language-restoration step exists anymore.

## 2. Routing design

- `apps/web/src/app/(platform)/[locale]/`: all platform pages (landing, auth, recovery, legal, studio, admin) moved here with `git mv`. Its layout prebuilds both languages (`generateStaticParams`, `dynamicParams = false`), renders `<html lang dir>` and supplies the language through `LocaleProvider`. Unknown prefixes such as `/fr/login` are 404.
- `lib/locale.ts`: `locales`, `defaultLocale = "en"`, cookie name `ichnara-locale`, `localeHref`, `splitLocalePath`, `negotiateLocale` (Accept-Language with q-values).
- `lib/locale-redirects.ts` + `next.config.ts` `redirects()`: un-prefixed URLs (`/` and the ten platform page roots) are redirected with static rules evaluated by the Next/OpenNext router, first match wins: legacy `?lang=ar|en` (old links and emails), then the saved `ichnara-locale` cookie, then a browser whose first language is Arabic, then English. Query strings are kept, so reset/verification tokens in old emails still work. All redirects are temporary (307).
- A Node `proxy.ts` was tried and rejected: OpenNext reports Node middleware as experimental on Cloudflare. Config redirects need no runtime code.
- `lib/use-interface-locale.tsx`: `useInterfaceLocale()` reads the provider and switches language with `router.replace` to the same page, query and hash under the other prefix (a soft navigation). On un-prefixed pages (portfolio and unmatched URLs) it saves the choice in the cookie and refreshes in place. `useRoutePath()` returns the path without its prefix for menus.
- All internal links (65) use `localeHref(locale, path)`. Auth callback URLs, recovery emails and the published-portfolio badge use the prefixed form.
- The `ready`/`localeReady` gating was deleted from every screen; `LoadingScreen` always renders its localized text.
- `apps/api/src/lib/auth/mail-templates.ts`: the email language comes from the callback path prefix, with the legacy `?lang` as fallback (new test in `apps/api/tests/mail-templates.test.ts`).
- `app/robots.ts` disallows `/admin`, `/ar/admin` and `/en/admin`.

## 3. Pages that mixed Arabic and English (fixed)

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

## 4. Verification evidence

- Server HTML: `/ar/login` contains `<html lang="ar" dir="rtl">` and the Arabic heading, no loading screen and no English heading.
- Redirects (`next start` and local workerd, identical): `/` with `ar-SA` → `307 /ar`; with `en-US` → `307 /en`; `/login?lang=en` → `307 /en/login?lang=en`; `/reset-password?lang=ar&token=abc` → `307 /ar/reset-password?lang=ar&token=abc`; `/studio` with cookie `ar` and English browser → `307 /ar/studio`; `/fr/login` → 404; `/p/<slug>` → 200 (not redirected).
- Browser navigation (`work/qa/locale-qa.mjs`): first load `/ar` and soft client navigations landing → login → signup → privacy → terms → home all kept `lang="ar"`, with zero loading screens (`loadingSeen: 0`); switching to English on `/ar/login` → `/en/login` without a loading screen; Back returns to `/ar`; `/ar/does-not-exist` shows the Arabic 404; switching language in the studio saves the pending edit first (saved role equals the typed value).
- Portfolio error page with the API stopped (`work/qa/portfolio-down.mjs`): English browser → English only, title "Ichnara"; Arabic browser → Arabic only, title "إيكنارا"; Arabic cookie with English browser → Arabic only; the visitor's saved cookie is not overwritten by a portfolio page.
- Local workerd (OpenNext build): the redirect table above, `/ar/login` Arabic title, `/en/privacy` "Privacy notice — Ichnara", `/fr/login` 404 with Arabic title for an Arabic browser.
- Gates: typecheck exit 0; Biome 392 files, 0 issues; web 37 pass / 0 fail / 685 assertions; guarded API 66 pass / 12 skip / 0 fail / 5143 assertions; Workers storage 8/8; Workers mail 15/15; `next build` and OpenNext build exit 0 without the Node-middleware warning.

## 5. Known limits (not hidden)

- A hard-loaded 404 *inside* a matched route (`/en/no-such-page`, `/p/<missing>`) is served by Next.js 16.4 as its minimal error document, then rendered by the client in the correct language. This is the framework's `notFound()` behaviour (the missing-portfolio page already behaved this way before this work); soft navigations are unaffected. Unmatched prefixes (`/fr/...`) still get the fully server-rendered global 404 in the visitor's language.
- Opening the studio still shows the loading screen while the account and site are fetched; that is data loading, not language restoration.
- The Arabic-browser redirect rule checks the first listed language only; deeper preferences fall back to English. The cookie overrides it after the first visit.
- Not verified on the hosted trial: nothing was deployed.
