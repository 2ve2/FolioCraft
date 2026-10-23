# 2026-10-23 — TanStack Query in the administration console

Request: the human asked whether React Query had been added to the dashboard, then said "ابدا" (start). Branch `claude/modest-davinci-osg31w` restarted from `main` `d87b3e7` (PR #15 merged). Nothing was deployed.

## Change

- **Cleanup first (separate commit).** `useAdminController` was only ever called with `dialogOnly = true`, so its page, resource-count and account-dialog paths had no caller. It became `useSiteModeration` (site overview read plus the password-confirmed suspend/resume), and the dialog became `SiteModerationDialog`. The unused copy keys (`securityPending`, `accountDetails`, `selfAccount`) and the `Counts` type were removed. No behavior change.
- **Dependency.** `@tanstack/react-query` 5.104.2 in `apps/web`, pinned exactly (see [DEPENDENCIES.md](../DEPENDENCIES.md)). Only console modules import it.
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

## Checks (local)

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
- Screenshots: [admin-sidebar-720-en.png](../screenshots/admin-sidebar-720-en.png) and [admin-sidebar-720-ar.png](../screenshots/admin-sidebar-720-ar.png). The sidebar is scrolled to its end on a 720 px tall window; the sign-out button sits at y≈654 px in both languages.
- Playwright e2e suite (`bun run test:e2e`, local isolated stack): 56 passed (2.7 min). The first attempt did not start any browser because the installed Playwright expects a newer Chromium build than the container provides; the rerun pointed `PLAYWRIGHT_BROWSERS_PATH` at the existing local alias of the provided Chromium.

## Not verified

- Behavior on the hosted trial; Safari and Firefox.
- The bundle-size difference was not measured.
