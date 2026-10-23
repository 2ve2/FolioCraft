# Logo, phone navigation, one-command release and two hardening fixes — 2026-10-23

Request (2026-10-23, before the human went to sleep): review the logo's weight and whether the black logo suits the platform; on narrow screens replace the sidebar's top buttons with a menu button that opens a sidebar, in the studio and the dashboard; propose and carry out further tasks; keep working through interruptions. The human delegated the decisions ("سوي يلي تبيه"). Branch `claude/modest-davinci-osg31w` from `main` `a5d11c5`. Nothing was deployed; no hosted system, secret or provider was accessed.

Environment: Bun 1.4.2; local PostgreSQL 16 `folio_test`; local production build (`next build` + `next start`) with the Bun API; Chromium 1194 through Playwright. QA scripts in ignored `work/qa` (`logo-shots.mjs`, `logo-board.mjs`, `drawer-shots.mjs`) and `work/logo`.

## 1. Logo v1.3

Measured on the shipped artwork before the change:

| | Latin lockup | Arabic lockup |
| --- | --- | --- |
| Tallest letter in the header | 31.5 px | 22.7 px |
| Stroke relative to letter height | 88 / 600 units | 140 / 732 units (Noto Sans Arabic 700) |
| Colour | all ink | all ink |

Options compared at header and display sizes: [logo-v1.3-options.png](../screenshots/logo-v1.3-options.png) (current; indigo emblem; Arabic 600 and 550; Arabic sized to the emblem at 600 and 700). Chosen: indigo emblem with ink word, Arabic Noto Sans Arabic 600 sized so its tallest letter spans the emblem like the Latin capital (both 31.5 px in the header), descender space trimmed so both languages keep the same header height. White single-colour lockup on the dark footer (the accent is 2.27:1 on ink).

- Pipeline check: `docs/brand/v1.3/generate.py` at weight 700 reproduces the previous Arabic outlines exactly (first path `M80 0 59 732H199L220 0Z`), then generates 600.
- Kit v1.3 regenerated with the existing scripts; `ichnara-logo-duo.svg` and `ichnara-logo-ar-duo.svg` added; v1, v1.1 and v1.2 archive URLs redirect to v1.3. ZIP CRC passed.

## 2. Phone navigation drawer

Below 970px the studio and administration sidebars become a top bar (logo and menu button). The button opens the same navigation, account and sign-out as a drawer from the reading-start edge, with backdrop, close button, Escape, focus kept inside and returned to the button. The admin overview counters became label/value rows (long labels broke through the numbers on phones).

- Screenshots, closed and open at 390 px: [studio, Arabic](../screenshots/drawer-studio-ar-390.png), [administration, English](../screenshots/drawer-admin-en-390.png).
- Local QA at 390/768/1440 px in both languages for studio and admin (owner role set on local fixture accounts in `folio_test` only): menu button present at 390 and 768, absent at 1440; horizontal overflow 0; page errors 0.
- New browser journey `e2e/navigation.spec.ts` (Arabic and English): closed state, drawer edge and width, section choice closes and returns focus, Tab stays inside, Escape and close button, desktop width restores the sidebar. The administration drawer is not in the committed suite because e2e enforces MFA for staff; it was checked in local QA.

## 3. One-command release

`bun run deploy:trial` (`scripts/deploy-trial.ts`): branch/clean/up-to-date checks, frozen install, web build with the trial origins, API then web deploy, `/health` and `/en` checks. `--cache` / `--normal` select and remember the manifests; `--dry-run` uploads nothing. Checks: the script refuses to run off `main` (exit 1 with the instruction); web build exit 0; dry-run bundles of all four manifests exit 0, including the cache web manifest with `--var PORTFOLIO_CACHE_ENABLED:true`. Not run against Cloudflare.

## 4. Hardening (audit findings 1 and 12)

- Wrong current passwords on change-password, delete-user and the password-checked two-factor endpoints count against the account's shared failure budget (5 per 15 minutes, then 15 minutes blocked; the budget administrative password checks already used), independent of IP. Test: five wrong attempts from five addresses, then the correct password is refused with 429 `PASSWORD_ATTEMPTS_BLOCKED` on change-password and two-factor enable; another account is unaffected.
- Upload completion validates in one short transaction, verifies and copies without locks, and marks the asset ready in a second transaction. Test: the owner deletes the upload during the copy (a request that needs the site lock, so it would wait under the old code); completion answers 409 and the late copy is removed.

## Gates

Typecheck exit 0; Biome clean; web 58/58; guarded API 95 pass / 12 conditional skips / 0 fail; Playwright 56/56 (2.7 min). An intermediate API run hit the sign-up limit because two runs were started within one minute; clearing the local `rate_limit` rows and rerunning passed. An intermediate Playwright run failed on two points that were fixed: the drawer position was read mid-animation, and the extra sign-ins pushed another journey over the 10-per-minute limit (API sign-in in e2e now waits out the limit and extends that test's budget by the same time).

## Known limits

- Logo choice is a design judgement under delegation, not a user study.
- Chromium only; no physical devices or screen readers.
