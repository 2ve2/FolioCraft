# Branded authentication emails — 2026-10-23

Request: the human asked to add the new logo to the platform's emails professionally ("زبط هذي"). Branch `claude/modest-davinci-osg31w` from `main` `16464e6`. Nothing was deployed and no email was sent.

## Change

- `apps/api/src/lib/auth/mail-templates.ts`: verification and reset emails rebuilt as table-based, inline-styled HTML (renders the same in Gmail, Outlook and Apple Mail): hosted logo with alt text (the brand name shows when images are blocked), title, greeting, intro, a table button, the link lifetime, the copy-link fallback, and a footer with the ignore notice and an automated-message note. Hidden preview text, `color-scheme: light`. Arabic emails are right-to-left with Tahoma first; the plain-text part carries the same content.
- Logos: `ichnara-email-en.png` and `ichnara-email-ar.png` rendered by `scripts/render-brand-kit.ts` from the v2 duo lockups at one scale (2x). The URL is built from the API's `WEB_URL`, so it points at the deployed web origin; it resolves only after the web app carrying these files is deployed.
- Link lifetime: the emails say one hour; `AUTH_LINK_MINUTES = 60` now sets Better Auth's `emailVerification.expiresIn` and `resetPasswordTokenExpiresIn` explicitly (both were the same library defaults). Only the reset email says the link works once (reset tokens are consumed; verification links are signed tokens).

## Checks

Mail template tests 5/5 (logo URL and alt text in both languages, link lifetime, PNG files exactly twice the declared display size); guarded API 97 pass / 12 skip / 0 fail; Workers mail checks 15/15 (mocked transport); typecheck 0; Biome clean. Rendered preview of both languages: [auth-email-v2.png](../screenshots/auth-email-v2.png).

## Not verified

Real mailbox rendering (Gmail, Outlook, Apple Mail, dark modes) and image loading from the hosted origin; this needs one real send after deployment.
