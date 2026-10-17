# General-launch acceptance

Assessment date: 2026-10-17 (Asia/Riyadh). This is a source/documentation review, not a fresh hosted security audit or provider acceptance test. The existing Cloudflare instance is a friends-testing trial. UI source through3013eec is uploaded to GitHub; upload is not deployment.

## Required work before opening public registration

1. **Complete hosted media.** Last recorded hosted flow: upload intent200, object PUT200, completion502 STORAGE_PROVIDER_ERROR. The failing hosted phase is unknown. Safely diagnose with the available phase diagnostics after an authorized API rollout; prove upload, validation, owned preview, publication, public image rendering, deletion and exact fixture cleanup on the hosted environment. Keep R2 private and draft/release access boundaries intact. Local R2 success does not clear this gate.
2. **Complete account recovery and verified mail.** Configure a project sender/provider and verify real delivery from the final Workers runtime, including verification and password-reset links. Current auth UI has login/signup and a check-inbox message, but no complete forgot/reset-password or verification-resend user flow. Implement these, localized actionable error states and valid final redirect destinations. Turn TRIAL_SKIP_EMAIL_VERIFICATION off only with a tested flow. Existing unverified trial users need an explicit verification transition, not automatic deletion. Prove expired/used-token behavior, resend, sign-in after verification and prior-session revocation after reset. Native Better Auth remains responsible for its protocol.
3. **Select the real launch environment and release it.** Confirm public name/address and whether the trial data/database should remain the launch environment. Do not reset existing users or records. A branded custom domain is recommended for a public product, but it is not technically necessary for a small trial. Configure final web/API URLs, browser build-time URLs, cookies/origins, storage CORS and canonical/sitemap origins consistently. Build and deploy the accepted source after explicit deployment authorization, API before web where compatibility requires it. Purchasing a domain/plan is a separate human decision.
4. **Prove the final hosted user journey.** Use disposable accounts to verify signup/verification/sign-in, onboarding, real save/reload, uploads, preview, publish, public detail pages/inquiries, edit-without-publish isolation, rollback/unpublish, reset and signout. Recheck two-account ownership denial, anonymous/admin boundaries and cookie/origin behavior on final hosts. Test Arabic/English, RTL, keyboard, narrow screens and representative actual mobile browsers. Existing local tests are evidence of implementation, not substitutes for this final hosted gate.
5. **Make data recovery and operations real.** Configure scheduled backups and retention for PostgreSQL and an intentional asset recovery policy; perform a documented restore into an isolated environment with representative sign-in, published snapshot and media recovery. Local structural restore proof alone is insufficient. Set uptime/error alerts and an operator response path; define safe rollback and monitor database connections, latency and provider capacity. Choose acceptable data-loss and recovery-time targets explicitly.
6. **Bound public usage.** Define/enforce per-account storage and relevant content/release limits, keep existing request limits, schedule safe expired-upload/rate-limit cleanup and measure a bounded realistic load. Verify the chosen Cloudflare/Neon/R2/Images/mail plans and actual account entitlements; do not promise unlimited free service or assume a paid plan is required without measurements. Current5MiB per-file validation is not a total storage allowance.
7. **Provide the public operating information.** Publish accurate privacy/terms/contact/reporting information for the actual operator and data handling, with a workable account/data-deletion request process and retention policy. Confirm jurisdiction-specific obligations with appropriate expertise; no legal-compliance certification is implied. Current footer intentionally has no invented legal/contact/social destinations. Document who handles abuse/moderation and support.

A gate is complete only when its actual environment, checks and results are recorded in STATUS. Source implementation, configured variables, successful CI, GitHub upload and deployment are different kinds of evidence.

## Already available

- Independent API/web, real PostgreSQL persistence, owned draft operations and transactional immutable publication.
- Shared preview/public rendering, Arabic/English/RTL, content/appearance editing and public detail pages.
- Inbox, release history/reactivation/unpublish and independent administrator management/moderation.
- Local integration/browser/build evidence; hosted trial signup/save/publication evidence; actual successful hosted CI foradc76cf.

Newest source CI is not confirmed in this assessment: unauthenticated GitHub Actions API returned404 and the GitHub CLI is unavailable. This is an access limitation, not a failed-run diagnosis.

## Useful later, not required for the initial free release

Subscriptions/payment, AI features, multiple layouts, advanced analytics, collaboration, custom domains for each portfolio and inquiry email notifications. Stored inquiries already have an inbox. Keep no-store until a deliberate cache implementation proves release isolation/invalidation. Begin with a small controlled beta after the critical gates pass; expand from measured usage.

## Suggested execution order

Hosted media diagnosis → account mail/recovery UI and delivery → final environment/URLs → final hosted acceptance, recovery and capacity proof → controlled public beta. Operating information/support can be prepared alongside these steps. No deployment, provider purchase or real-account mutation is authorized by this document.

## Current official references

- Better Auth email/password and reset flows: https://www.better-auth.com/docs/authentication/email-password
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
