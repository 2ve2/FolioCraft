# 2026-10-23 — External review reports: verification and fixes

The human shared two Arabic review reports of the trial (https://lord2ve.tech) and asked for an opinion ("ايش رايك بهذا الكلام؟"):
- **Journey review:** a signed-in walkthrough with a fictional account, in Chrome at desktop width.
- **Visitor review:** a public, signed-out pass, in Chrome desktop and mobile emulation.

Each finding was checked against the code before anything changed. Nothing was deployed.

## Findings

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

## Follow-up: the 404 page

- **Request.** The human felt the 404 text looked broken ("احسه خربان").
- **Cause.** The "404" numeral used IBM Plex Mono, whose zero has a centre dot. At -10px tracking the numeral read as "4•4", and the decorative card covered the last digit. The English heading ("This page is out of the picture.") was an idiom, under an all-caps eyebrow.
- **Change.**
  - The numeral uses the interface face with plain figures and -2px tracking, and the card sits beside it.
  - The copy is now "Error 404" / "We can't find this page" and "خطأ 404" / "لم نعثر على هذه الصفحة", with plainer guidance.
- **Checked.** Screenshots in both languages at 1440 and 390 px. Playwright e2e 56 passed with the updated routing assertion.

## Checks (local)

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

## Not verified

- The hosted trial (these fixes are not deployed), real storage uploads, and browsers other than Chromium.
