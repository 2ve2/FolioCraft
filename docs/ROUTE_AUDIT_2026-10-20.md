# Test-domain route audit — 2026-10-20

## Scope and source
Human requested independent page/route testing, explicitly permitted synthetic accounts, then authorized a small retained synthetic R2 image. No real-user changes, role changes, production migrations, bucket/settings changes or new deployment during the audit. Source implementation head0ba115a, documentation head12d844c; active API00b403f4-6600-4b33-bd2e-71477bb1fd8c and web95c3b7d0-9590-4f8b-8cc8-78ed8c778f9d reverified at100%.

Actual source inventory:28 web routes;99 direct domain method/path pairs;53 native-auth endpoint definitions expanding to55 method/path pairs. Two generic native-auth dispatchers are excluded from the99 count. A route probe is not proof of every UI action or input combination.

## Actual results
- Anonymous deployed sweep:212 HTTP probes (99 domain,55 native,56 bilingual web checks,2 unknown routes).209 matched initial expectations; native POST get-session returned the intentional405 METHOD_NOT_ALLOWED_DEFER_SESSION_REQUIRED; two mail operations returned503 MAIL_UNAVAILABLE. Source confirms these method/mail boundaries. No500 or transport failure. Raw initial exceptions are retained; they are not silently rewritten as successful mail delivery.
- Authenticated deployed continuation:80/80 checks pass. Own profile/draft/locale, publication, retained-release activation, draft/public isolation, published project/article, own inbox/status, removal from draft, native session/account reads,33 ordinary-account administrative denials, wrong-password rejection, successful login/logout/re-login, cleanup unpublish and signout. Initial run separately passed51 checks and correctly rejected publishing an incomplete fixture with400 PROFILE_REQUIRED; the fixture lacked a role. That run unpublished/signed out; corrected fixture ran in another account, keeping credentials memory-only.
- Initial authenticated run additionally exercised all five collection list/create/item/patch/reorder routes, profile/appearance/sections reads/patches, aggregate saving, revision conflict and unchanged persona after appearance changes. Its single unexpected-for-the-helper response was an expected product validation, not a confirmed application defect.
- Live image flow:24/24 pass. One synthetic48x32 PNG, signed owner-scoped upload, canonical-origin R2 preflight, successful PUT, actual Workers verification/copy and dimensions, repeated completion, private bytes equality, asset listing, draft attachment, unpublished public denial, publication, valid public redirect/CORP, public bytes equality and HTML asset reference. Site unpublished and public image denied afterward. Image retained under authorization. Signed URLs, cookies and passwords never persisted or printed. This is actual HTTP/Workers/R2 proof, distinct from browser uploader UI acceptance.
- Final public/CORS/domain checks:21/21 pass. Canonical CORS permission only; www/old workers.dev origin receive no Allow-Origin. Public notices valid; reference published API/page/sitemap valid; both domain attachments correct.
- Fresh local checks: typecheck0, Biome357 files0, web31 pass/636 assertions, synthetic Workers storage6/6. Guarded API56 pass/12 skip/2991 assertions, plus enforced-MFA child11 pass/308 assertions. The parent skips are recorded, not counted as passes. Initial missing-local-DB failure and default socket-directory permission failure were corrected with the existing isolated cluster and a project-local socket. Cluster started only for the guarded suite and stopped afterward; no Neon migrations or direct SQL changes.

## Browser evidence
Hosted signup/onboarding, session survival after reload, persisted profile/project/article/experience/education/skills, appearance and expanded preview retaining content, publication, project/article details, private draft isolation, own contact-message submission/read status, report-dialog keyboard wrap, Arabic interface/content labels and RTL, retained-release preview/activation observed.15 English admin pages denied an ordinary account, including two staff-enrollment gates; Arabic denial and six recovery-page variants observed. Recovery without a token shows disabled password controls and a truthful invalid-link message.

A browser-control timeout occurred at native unpublish confirmation. Later input resumed for recovery-mail reproduction, but browser logout, dirty-logout confirmation and image-upload controls were not accepted as complete. API equivalents passed separately. The browser test site remains published pending explicit verified unpublish. A screenshot was inspected in the browser tool; no screenshot artifact file is claimed.

Initial responsive attempts targeted the wrong selected tab: requested sizes did not match the inspected tab's actual innerWidth. They are excluded from responsive acceptance. Full device/browser matrix remains open until actual dimensions are verified.

## Confirmed finding and unavailable dependencies
1. Recovery request error is outside the fieldset and immediately after submit: measured0px gap,13px font,24.7px line height,12px padding,408x50.6875px at the measured desktop viewport. The more-specific .auth-card > p rule overrides error color with muted rgb(112,108,128) and its margins. Login places its error inside the fieldset before submit and uses shared error-box styling. Human requests using that existing arrangement and values; a separate narrow fix is now in progress. No arbitrary sizing values are proposed as acceptance.
2. Verification/reset mail is unavailable because SMTP is not configured.503 MAIL_UNAVAILABLE is truthful; successful recipient delivery/reset-token completion remains untested. No provider or fabricated configuration was added.
3. Privileged hosted admin success/MFA actions were not exercised: no real role change/staff credential was authorized. Ordinary/anonymous denial is proven; local guarded permission/MFA tests are separate evidence.
4. Native optional OAuth and destructive/security account routes received negative/invalid probes only. Successful provider login, account removal, password/factor changes, mail delivery, every action/input combination and browser upload/logout are not certified.

## Test-data footprint and cleanup
Four synthetic accounts and four owned sites were created: one browser account/site, one incomplete API fixture, one complete API fixture and one image fixture. Three API-created sites were verified unpublished and their sessions signed out. The browser site qa-mvghqfok remains published after the confirmation/control limitation. One synthetic PNG is retained; no real account/site/object was modified and no account was permanently deleted. Existing real-site published data was read only. Credentials remained memory-only.

## Route-by-route web HTTP coverage
Both locale variants are listed below as HTTP status checks. Private200 responses are shells, not authorization acceptance; the separate browser/API gates establish the stated denial or own-account behavior. Dynamic detail404 probes used absent IDs; real synthetic details were independently exercised successfully.

- `/`: 200/200.
- `/robots.txt`: 200/200.
- `/verify-email`: 200/200.
- `/reset-password`: 200/200.
- `/forgot-password`: 200/200.
- `/studio`: 200/200.
- `/signup`: 200/200.
- `/login`: 200/200.
- `/sitemap.xml`: 200/200.
- `/admin`: 200/200.
- `/admin/staff`: 200/200.
- `/admin/requests`: 200/200.
- `/admin/requests/[id]`: 200/200.
- `/admin/system`: 200/200.
- `/admin/notices`: 200/200.
- `/admin/reports`: 200/200.
- `/admin/reports/[id]`: 200/200.
- `/admin/mfa-required`: 200/200.
- `/admin/security`: 200/200.
- `/admin/activity`: 200/200.
- `/admin/accounts`: 200/200.
- `/admin/accounts/[id]`: 200/200.
- `/admin/sites`: 200/200.
- `/admin/sites/[id]`: 200/200.
- `/p/[slug]`: 200/200.
- `/p/[slug]/sitemap.xml`: 200/200.
- `/p/[slug]/articles/[articleSlug]`: 404/404.
- `/p/[slug]/projects/[projectId]`: 404/404.

## Evidence
Ignored work/full-route-audit contains source inventory, raw HTTP sweep and explicit classification, initial/corrected authenticated results, live-image results, final public/CORS checks, and local gate logs. Helpers use memory-only credentials and scrubbed metadata. The report summarizes actual results; no complete or100% security/browser guarantee follows.

## Subsequent repair checkpoint
Human requested matching login feedback without invented values. Confirmed finding1 was fixed in5eef9c8 by moving the request alert into fieldset before submit. No CSS numeric additions.12/12 local bilingual comparisons at verified320/390/1280 match existing login styling; typecheck/Biome357/web31 tests636 assertions/QA and Cloudflare builds/dry run pass. Trial web now `82572492-b169-427f-97eb-43cb96eefbcb` at100%, eight startup URLs200 and actual hosted Arabic error placement/style verified. API remains unchanged. SMTP dependency and the other audit limitations/test-data footprint remain open; this checkpoint supersedes only the finding1 presentation status. Later corrected selected-tab measurements also reproduced the original0px separation at actual320/390/768/1280, without overflow.
