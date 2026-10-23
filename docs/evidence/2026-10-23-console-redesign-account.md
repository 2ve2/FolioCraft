# 2026-10-23 — Console redesign, infinite lists and the studio account page

Request: the human asked for the best option on account deletion ("سوي الافضل"), a dashboard "very organised like other companies' dashboards", whether shadcn should be used, whether infinite React Query should be used, and for proactive decisions ("انا مو لازم اعلمك كل شي"). Branch `claude/modest-davinci-osg31w`, on top of the open TanStack Query work. Nothing was deployed.

## Administration console

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

## Studio account page

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

## Decisions

- **shadcn/ui was not adopted.** It is built on Tailwind CSS and Radix. This app has its own tokens, CSS modules and tested RTL controls (select, dialog, tooltip, drawer), so adding shadcn would mean two styling systems and duplicate controls. The console kit follows the same patterns: tables, badges, cards and toolbars. This can be revisited if the whole web app moves to Tailwind.
- **Self-service deletion was chosen** over a request to staff, on the human's "do the best". It is immediate, password-confirmed and staff-guarded.

## Checks (local)

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
- Screenshots: console overview (EN and AR), accounts (EN, AR at 390 px), site and report details, studio account (EN, AR at 390 px) in `docs/screenshots/console-v2-*` and `studio-account-*`.
- Full guarded API suite: 103 pass / 12 skip / 0 fail. Playwright e2e: 56 passed (2.8 min), using the local Chromium alias.

## Not verified

- Real email delivery for the email-change messages; the hosted trial; Safari and Firefox.
