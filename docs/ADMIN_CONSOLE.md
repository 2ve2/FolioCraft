# Admin Console: P0 design and approval record

Date: 2026-10-18, Asia/Riyadh. Status: documentation complete; design proposals await human approval before P1. This document is a design, not evidence that its proposed controls already exist.

## 1. Scope and authority

The human requested P0 only after reading ADMIN_CONSOLE_TASK.md in full, including its corrective appendix. Deliver English documentation of the existing implementation, fixed requirements, permission matrix, reason/reauthentication boundary and phase plan. No application code, dependencies, environment files, SQL or migrations are changed. No database connection, account promotion, GitHub push, deployment or provider operation is authorized. A later instruction must authorize P1; approving this document does not silently authorize external actions.

The task fixes the architecture below. Specific policies marked **Proposed** need approval; they are not human-confirmed defaults. Existing API.md and OPERATIONS.md describe the current system, while this document describes the intended replacement. Do not present the future API as already available.

## 2. Observed current state and discrepancies

Read-only source inspection covers apps/web/src/app/admin, the management/admin feature, apps/api/src/routes/admin and services/admin, middleware/admin.ts, lib/auth/index.ts and hooks.ts, and db/schema/admin.ts, auth.ts, site.ts and operations.ts. The installed Better Auth package reports version 1.7.7.

- The administrative role is currently `admin`, alongside ordinary `user`. middleware/admin.ts, auth/hooks.ts and admin-shell.tsx each contain their own literal role check. There is no owner/moderator/support/analyst policy or central permission registry.
- requireAdmin invokes requireAuth and rejects impersonated sessions. Native hooks also reject impersonated administrative requests, with a specific validated-original-session restoration path for stop-impersonating. Preserve that exception so an impersonated user can exit safely.
- Native Admin plugin is configured as `admin()` without custom access control or two-factor plugin. No MFA gate or explicit freshAge override exists in project auth configuration.
- Platform routes currently expose GET sites, site detail, resources and audit, plus POST site suspend/resume. Parent middleware gates all child routes. No per-route permission declaration exists.
- Site DTOs contain metadata and counts, excluding private drafts, release snapshots and inquiry bodies. Current published counts count retained release pointers, including inaccessible moderated sites; they must not be relabelled as available public websites.
- Site suspend/resume validates a trimmed reason of 3–500 characters and commits the state plus audit in one transaction. The requested sensitive-operation minimum of 10 is a future change, not an existing guarantee.
- admin_audit has a nullable reason, actor/target/request identifiers, metadata and attempted/succeeded/failed statuses. Native mutation hooks insert attempted rows without a required reason, then UPDATE their outcome. No administrative HTTP update/delete endpoint exists, but the internal writer is not append-only. The actor foreign key also uses ON DELETE SET NULL; strict historical byte immutability is not currently guaranteed.
- Native administrative operations are directly callable under /api/auth/admin/* by an authorized admin. The UI directly invokes adminClient for user listing, ban, unban, session revocation and set-role. Client exact-ID/self-action checks do not prove backend last-owner or self-role protections.
- Account list and dialog render the full account email. Masking and separately audited revelation are not implemented.
- Current pages are overview, sites, accounts and activity, with shared responsive AdminShell, localized copy, controller and native dialogs. Account/site detail routes and the new reports, requests, notices, system, staff and security experiences do not exist in this area.
- Root metadata currently defaults to noindex; API middleware sets no-store. No dedicated administrative page no-store response policy is declared in the inspected admin layout/Next configuration. Page response-header proof is not performed in P0; API no-store must not be treated as proof for static administrative HTML.
- No content_reports, data_requests, system_notices, admin_notes or two-factor schema exists in the inspected project schema. No report intake, data-rights workflow or notices API is registered in the inspected routers.

**Unverified account assertion:** source proves no automatic bootstrap grant; it cannot prove that no administrator has ever been promoted. Historical continuity includes an excluded account-permission operation and references to an existing authorized admin. No account identifier or grant evidence is copied here. Actual local/hosted role inventory is unknown; P0 does not query it. The task's “no promoted administrator” premise must therefore not be treated as verified.

These differences were reported to the human during P0. They are documented rather than repaired in this phase.

## 3. Fixed architectural requirements

- Keep /admin in apps/web and /api/admin/* in the independent Bun/Hono API. No subdomain. Isolate administrative modules for later relocation. Pages require noindex and no-store; route secrecy is never authorization.
- Use Better Auth createAccessControl with its native defaultStatements, preserve the existing comma-separated role text as the authority, and introduce owner, moderator, support and analyst alongside ordinary user.
- One shared pure policy module defines roles, statements, normalization and permission evaluation. Backend middleware and native hooks import the same policy. The UI consumes /me/permissions and may share pure labels/types; it must never import server credentials or create a competing role check. Audit remaining Studio and account-list role checks when implementing P1.
- Every /api/admin endpoint declares its required permission through central requirePermission(resource, action). Missing declarations deny execution and fail a route-enumeration test. Re-read authoritative session/role state for every request; do not trust cookie-cached privileges, UI visibility or caller-supplied role/actor IDs.
- Preserve requireAuth, site ownership on personal operations, production email-verification policy and its existing explicitly authorized trial exception, Origin, CORS, rate limits, trusted client-IP replacement, URL restrictions and impersonation denial. Administrative access to another user's metadata uses explicit permission and target checks, never a fake ownerId bypass.
- Staff require TOTP enrollment before console data or /api/admin access. ADMIN_REQUIRE_MFA defaults true in production; false is permitted only in development/test. An enrollment-only security surface is necessary; it must expose no management data.
- Sensitive actions require reason, recent password reauthentication and audited denial. Last-owner protections, owner-only destructive staff actions and explicit typed deletion confirmation are mandatory.
- Published site content and metadata are the ordinary administrative view. Only owner with site.read_draft may read a private draft, with reason and reauthentication. Default account email is masked for every role, including owner.
- New tables never store raw IP addresses. Tokens, cookies, passwords and TOTP secrets never appear in administrative DTOs, logs or audit metadata. Enrollment/recovery material is an exception only in the native self-service setup response and must never be logged/exported.

## 4. Product permission matrix

Allow means eligibility, subject to authentication, MFA, target restrictions and action-specific controls. Deny is the default. Ordinary user has no permission in this matrix. A comma-separated combination receives the union of known-role grants; protective restrictions still apply. Unknown tokens never grant access and role-setting rejects unknown values. All account reads mask email until explicit revelation.

| Product permission | owner | moderator | support | analyst |
| --- | --- | --- | --- | --- |
| user.read | Allow | Allow | Allow | Allow |
| user.read_email | Allow | Deny | Allow | Deny |
| user.ban | Allow | Deny | Allow | Deny |
| user.unban | Allow | Deny | Allow | Deny |
| user.revoke_session | Allow | Deny | Allow | Deny |
| user.impersonate | Allow | Deny | Allow | Deny |
| user.set_role | Allow | Deny | Deny | Deny |
| user.remove | Allow | Deny | Deny | Deny |
| user.set_password | Allow | Deny | Deny | Deny |
| site.read | Allow | Allow | Allow | Allow |
| site.read_draft | Allow | Deny | Deny | Deny |
| site.suspend | Allow | Allow | Deny | Deny |
| site.resume | Allow | Allow | Deny | Deny |
| report.read | Allow | Allow | Allow | Allow |
| report.handle | Allow | Allow | Deny | Deny |
| request.read | Allow | Deny | Allow | Deny |
| request.handle | Allow | Deny | Allow | Deny |
| request.export | Allow | Deny | Deny | Deny |
| notice.read | Allow | Allow | Allow | Allow |
| notice.manage | Allow | Deny | Deny | Deny |
| audit.read | Allow | Allow | Deny | Allow |
| audit.export | Allow | Deny | Deny | Allow |
| system.read | Allow | Deny | Deny | Allow |
| staff.read | Allow | Deny | Deny | Deny |
| staff.manage | Allow | Deny | Deny | Deny |

### Native Better Auth permission mapping

Installed defaultStatements declares user actions create, list, set-role, ban, impersonate, impersonate-admins, delete, set-password, set-email, get, update, and session actions list, revoke, delete. Preserve these exact native names. Extend the user statement with product read, read_email, unban, revoke_session, set_role, remove, set_password; reuse ban and impersonate rather than overwriting their native meaning. Extend with site, report, request, notice, audit, system and staff from the product matrix. Do not replace the native user/session arrays when merging statements.

| Product permission | Native permission / operation | Additional application gate |
| --- | --- | --- |
| user.read | user.list / list-users; user.get / get-user; session.list / list-user-sessions for account detail | Mask email; sanitize sessions; minimize staff detail |
| user.read_email | No separate native permission; dedicated domain read | Audited POST reveal-email, no raw native response |
| user.ban | user.ban / ban-user | Reason, password/freshness, staff/last-owner protection |
| user.unban | user.ban / unban-user | Separate product unban check despite shared native grant |
| user.revoke_session | session.revoke / revoke-user-session and revoke-user-sessions | Resolve supplied session ID privately; do not expose token |
| user.impersonate | user.impersonate / impersonate-user | No staff target; bounded duration; original-session restoration |
| user.set_role | user.set-role / set-role | Also staff.manage; no self-role edit; last-owner guard |
| user.remove | user.delete / remove-user | Typed target confirmation; owner/staff protection; deletion gaps |
| user.set_password | user.set-password / set-user-password | Password never audited or echoed; owner-only |

Grant native user.list/get and session.list only to roles with corresponding permitted account views. Owner/support receive native ban/impersonate/session.revoke; owner alone receives native set-role/delete/set-password. All other native grants, including create/update/set-email, session.delete and impersonate-admins, remain denied unless separately specified later. Merely merging statements does not grant actions. No role, including owner, receives user.impersonate-admins.

**Proposed legacy policy (A1):** replace legacy admin with owner, with no permanent alias. Until an explicitly authorized reviewed role change, legacy-only admin fails closed under the new policy; do not automatically promote it or silently reinterpret it as owner. This is simpler and avoids an invisible fifth staff role, but rollout can lock out legacy staff. Alternative: temporary admin-to-owner alias, explicitly time-bounded and included in every staff/last-owner check; this automatically gives existing admins owner power and needs separate approval. No role-data update is part of P0 or implied by the recommendation.

## 5. Proposed reason and reauthentication design (A2)

### Wrapper and native-hook boundary

1. The console calls only our /api/admin wrappers for administrative reads and operations. It no longer calls authClient.admin directly. Authentication, TOTP and ordinary own-session flows retain their native protocol.
2. Each wrapper applies session, non-impersonation, MFA and declared permission checks; validates a strict bounded body; resolves target; enforces staff/last-owner rules; and validates reason and reauthentication for sensitive actions.
3. Reason is trimmed, 10–500 characters, nonblank after trimming, stored as admin_audit.reason and never used as authorization. Reject secrets in UX guidance; avoid request-body logging. Extend this consistent minimum to site suspend/resume. A reason records operational purpose, not arbitrary proof of legitimacy.
4. For native operations the wrapper invokes the installed server auth.api method in-process, inside an AsyncLocalStorage-scoped internal capability. The capability is a server-created, single-use object bound to actor ID, authoritative session ID, native path, normalized target/operation, validated reason, audit correlation and expiry for that one invocation. Never encode it in an HTTP header, browser cookie or client JSON. Public requests cannot manufacture it; reject misleading bypass headers. No loopback HTTP forwarding.
5. The existing native before hook independently rechecks the authoritative session, centralized permission, MFA, reason/freshness and target restrictions. Every /admin/* native read/mutation is allowlisted and requires a matching internal invocation; unknown or direct calls fail closed. Consume the capability once. Explicitly deny create/update/set-email and any unplanned native action rather than leaving a hidden bypass. Domain-only reveal-email/read-draft use the same guard without invoking a native user read that exposes excess fields.
6. Native endpoints continue to execute the account/session operation. Use their actual response/error/status and forward every required Set-Cookie header separately, especially for impersonation and restoration. Sanitize native user/session response DTOs before returning domain results; never send session tokens to the console. Do not rewrite Better Auth's public /api/auth protocol into the domain envelope.
7. Native before/after hooks append attempt and outcome events using the same correlation. Fail closed before sensitive execution if durable attempt auditing fails. If an outcome write fails after the native mutation, retain the attempt and report an indeterminate result; do not invent rollback or automatically repeat a destructive action.

This mechanism must be proved in P1/P2 on Bun and the existing Workers request context, including parallel requests, exception cleanup, target/path mismatch, direct HTTP calls with forged headers and cookie propagation. In-process API availability, hook execution and adapter context are acceptance conditions, not claims already tested in P0. No client-controlled “trusted wrapper” header or reusable global bypass flag is acceptable.

### Password and freshness semantics

The installed freshSessionMiddleware compares session.createdAt to session.freshAge. A value of zero disables that check. Installed server-only verifyPassword checks the credential but does not renew createdAt. This matches the [official session freshness documentation](https://better-auth.com/docs/concepts/session-management). Do not claim a successful password check refreshes an old session.

**Proposed policy:** ADMIN_REAUTH_WINDOW_SECONDS = 300, positive and bounded, shared with Better Auth session.freshAge. Every sensitive wrapper requires the current actor password for that invocation, verifies it using native server-only auth.api.verifyPassword and requires the same authoritative session to be within freshAge. Thus a newly stolen session alone is insufficient. Do not store passwords or a browser “reauthenticated” flag. If the session is stale, require normal password sign-in plus TOTP to create a fresh session and then retry the explicitly confirmed action. Never rewrite session.createdAt/updatedAt to fake reauthentication. A session refresh must not count as password sign-in.

This conservative approach requires an extra sign-in after five minutes and changes native freshness checks globally, including ordinary-user sensitive flows; that UX effect needs approval. If inline reauthentication without new sign-in is required, design a separate durable, session-bound password-verification record and reconcile it explicitly with freshAge before implementation; that alternative is not silently authorized here. Enrollment, password reset or a trusted-device shortcut must not produce administrative freshness without the required password proof. Staff accounts without password credentials cannot perform sensitive operations under this policy.

### Sensitive action coverage

Ban, unban, revoke one/all sessions, impersonate, set-role, remove-user, set-user-password, private draft read and full email reveal all require 10-character reason, password verification/freshness and durable audit. **Proposed extension:** require the same controls for site suspend/resume, data export and staff changes. Non-sensitive bounded lists do not prompt for reasons. Report closure separately requires a resolution note.

Deletion requires the exact target account ID typed by the operator, validated server-side. Re-read actor/target state immediately before mutation. Deny role changes to self; support cannot destructively affect any staff account, even if another assigned role also grants ordinary account operations. Owner-only destructive staff actions still cannot ban/delete/demote the last usable owner.

**Concurrency proposal:** serialize all owner-affecting native mutations with a PostgreSQL advisory lock held on a dedicated live connection across the authoritative owner-count check and awaited native result. Release it in finally, with explicit timeout/failure handling; every wrapper/hook path must use this shared lock discipline. Count remaining non-banned owners after the proposed change; do not rely on an unlocked count followed by mutation. Prove simultaneous demotions/bans/deletions leave one usable owner, including mixed-role users and expired bans. Direct native calls are blocked; external database operator actions remain outside this application guarantee. This is a coordination proposal, not a claim that the native mutation and audit share a transaction. Existing pg/Workers max-one request pools require explicit integration proof; if a safe lock lifetime cannot be demonstrated, stop P2 instead of shipping a race-prone check.

### MFA enrollment and impersonation exceptions (A3)

ADMIN_REQUIRE_MFA=true is mandatory in production; disallow a production false override. The ordinary console and all /api/admin endpoints deny unenrolled staff. To avoid an impossible enrollment loop, /admin/security and /admin/mfa-required render an enrollment-only shell through authenticated native self-service auth endpoints; they fetch no /api/admin data until enrollment is verified. After enrollment require a new native password/TOTP sign-in before management access. Disabling/resetting MFA must immediately remove console eligibility; recovery and session invalidation need P2 tests. Recovery material is shown only to its owner through native setup and never to staff lists.

Configure impersonationSessionDuration from proposed ADMIN_IMPERSONATION_MAX_SECONDS = 900 and allowImpersonatingAdmins=false. Also configure all staff roles as adminRoles and deny user.impersonate-admins, since installed native code otherwise permits that separate grant. Explicit target-role checks reject all staff, including a mixed-role target and any approved legacy alias. Keep a visible localized impersonation banner with an effective stop action in the impersonated workspace.

An impersonated session never enters /api/admin, including a stop wrapper there. **Proposed escape route:** POST /api/auth/admin-console/stop-impersonating, outside /api/admin, authenticates the impersonated session and cryptographically validated original-session cookie; requires no stale-password/MFA hurdle that could trap the user; creates only a capability for the native stop operation. Native hook revalidates the original actor and binds the existing start reason/correlation, then records restoration. A deleted/revoked/expired original session yields safe sign-out guidance, never a fabricated original identity. Start requires reason/password/MFA; stop reuses the original reason and is audited. This narrow exception requires approval because it adds an auth-namespace application wrapper, not a general administrative bypass.

## 6. Endpoint authorization and data projections

The following mapping is a plan. Current /resources must receive system.read or be retired when /overview exists; do not leave compatibility paths ungated.

| Planned endpoint group | Declared product permission |
| --- | --- |
| GET /api/admin/me/permissions | user.read; minimum console identity response only |
| GET /api/admin/overview | user.read; include each section only with its own resource permission |
| GET /users, /users/:id, account session list | user.read; mask email and sanitize session fields |
| POST /users/:id/reveal-email | user.read_email |
| Account mutation wrappers | Exact user action in the native mapping; set-role additionally staff.manage |
| GET /sites, /sites/:id, published release history | site.read; no editing draft |
| Private draft wrapper | site.read_draft |
| POST site suspend/resume | site.suspend / site.resume respectively |
| GET /reports, /reports/:id | report.read |
| POST /reports/:id/status | report.handle; site.suspend additionally for actual suspension |
| GET /requests, /requests/:id | request.read |
| POST /requests; PATCH /requests/:id/status | request.handle |
| POST /requests/:id/export | request.export |
| GET /notices | notice.read |
| POST/PATCH/DELETE /notices | notice.manage |
| GET /audit; GET /audit/export.csv | audit.read / audit.export respectively |
| GET /system; compatibility GET /resources | system.read |
| GET /staff | staff.read |
| Staff role mutation | staff.manage AND user.set_role |
| GET/POST /notes | Pending A4; target-specific read and mutation policy below |

Overview must omit forbidden audit/request/system sections rather than return their data and hide them in React. Permissions discovery does not enumerate accounts or MFA secrets. Public report submission and active public notices are outside administrative RBAC and retain public validation/origin/rate limits. UI route denial uses a localized forbidden view; it never authorizes API data access. New cursor pagination must have stable ordering and bounded size; do not reuse current offset pagination while claiming cursor support.

**Notes gap (A4):** the fixed matrix defines no notes resource. Proposed GET notes requires user.read for user targets or site.read for site targets; POST notes additionally requires staff.manage for staff-account targets, user.ban for ordinary-user targets or site.suspend for site targets. This lets owner/support annotate ordinary users and owner/moderator annotate sites; analyst reads but never writes. No note edits/deletes. Human must approve this mapping or explicitly add note permissions. Do not invent undeclared grants. Reporter emails/request contact details require minimized projections; ordinary report.read must not silently become user.read_email. Staff status/activity beyond an account's basic role remains behind staff.read.

## 7. Audit, privacy and future data additions

**Proposed append-only transition (A5):** preserve historical rows as-is; replace native attempt-finalization UPDATE with separate attempted and succeeded/failed inserts sharing requestId plus sanitized operation correlation. An unresolved attempt is indeterminate, not proof of failure. permission_denied is an action with existing status failed, not an invented fourth SQL status. No audit mutation or deletion endpoint. Test source/API writers, not only the absence of UI buttons. Existing ON DELETE SET NULL behavior must be disclosed; strict database immutability, triggers and FK changes require separately reviewed SQL and are not implied by this design.

Denied calls record authenticated actor ID where known, bounded action/target IDs, permission and failure code, timestamp and validated reason when available; do not record raw request bodies or spoofed actor identity. Proposed shared database limit: 10 denial events per actor/action per 60 seconds, plus a global bounded unauthenticated bucket. Excess is suppressed with a bounded aggregate signal; the response remains denied. Authorization must not become allowed when the audit limiter is exhausted. Limit keys contain no raw IP, email or session token. Audit outage denies sensitive execution and produces redacted operational failure evidence.

Audit CSV proposal: at most 1,000 rows and 1 MiB, explicit bounded dates, deterministic ordering, no-store attachment and spreadsheet-formula escaping. Export only event/actor/target/request IDs, action, status and time; exclude free-text reasons, metadata, email and IP hashes from CSV. Interactive audit access may show sanitized operational reasons without exposing secrets. Never embed session tokens, full request contact data or password/TOTP material.

**Retention proposal:** no automatic deletion and no new scheduler in these phases. Retain existing audit records pending a human-approved retention period and access/archive process; indefinite retention is an unresolved policy, not a compliance claim. A proposed 180-day searchable window plus separately approved archival/deletion policy needs legal/operational confirmation before launch. Never treat that proposal as authorization to delete old rows.

Future additive tables are content_reports, data_requests, system_notices and admin_notes as specified in the task, plus installed-plugin two-factor tables and standard additional auth fields. Review exact SQL, including indexes, FKs, PII and compatibility, before any application on folio_test. Show any user/sites additions to the human first. No SQL is authored in P0.

- Reports: stated categories, message maximum 1,000, optional reporter email, salted IP hash, handler/time/resolution fields; indexes on status/created_at and site_id. Proposed REPORT_IP_HASH_SALT is server-only, at least 32 random bytes, validated in config/env.ts and added empty to .env.example in a later authorized phase. Use keyed SHA-256 with versioned domain separation and a trusted derived address; never fall back to raw IP or a hard-coded salt. Report intake rate limits, missing-address handling and salt rotation must be tested without logging the address/hash.
- Data requests: received/in_progress/completed/rejected with identity-verification evidence before export/deletion. Proposed DATA_REQUEST_DUE_DAYS = 30 is an operational placeholder needing jurisdiction/legal confirmation, not a statutory deadline claim. Status completion requires actual work evidence. JSON export must be bounded and confined to the verified subject's data; request.export does not grant unrelated private drafts.
- Notices: info/maintenance/incident, required Arabic and English messages, start/end ordering, active flag and creator. Public API returns only currently active notices; studio/home banner must reflect real records.
- Notes: append-only internal user/site notes with author/time; target authorization and PII minimization apply.
- Account removal: auth/site relational cascades do not establish R2 object erasure. Existing signed links can survive for their documented expiry; backups/audit retention and provider bytes need an explicit deletion procedure. Do not mark a data-rights request completed merely because the user row was deleted. No invented R2 deletion or legal completeness claim.

## 8. Phase plan and evidence gates

Each authorized phase starts with a CHANGELOG scope entry, ends with STATUS evidence and a separate conventional commit in work/github-upload. No push or deployment follows automatically. This request ends at P0 even though the larger task describes P0–P2 as its first implementation batch.

| Phase | Scope and acceptance evidence | Current status |
| --- | --- | --- |
| P0 | Current-state findings; fixed/proposed decisions; exact matrix/native mapping; wrapper/reason/freshness design; open approvals; phase plan | Documentation complete; approval pending |
| P1 | Shared access policy, custom Better Auth statements/roles, middleware, explicit endpoint manifest and masked read wrappers; remove literal admin checks/direct native UI calls; role-by-endpoint and deny-by-default tests, including aliases/native bypass | Not authorized; requires P0 approval |
| P2 | TOTP/schema review, enrollment/security minimum UI, reason/password/freshness wrappers, legacy handling, last-owner concurrency, impersonation escape/banner, email masking/reveal, audited denial and append-only writer transition | Not authorized; separate SQL review and local-only approval gates |
| P3 | Report table/intake/form, queues/details, validation/rate limits, status/closure tests and shared-renderer report action | Await later approval after P2 evidence |
| P4 | Account/site list and detail pages, search/filter/cursor, sessions/actions/notes, published-only inspection; native/draft/email boundary tests | Future only |
| P5 | Audit filters/detail/CSV, system configuration booleans/real counts, notices CRUD and real public banners | Future only |
| P6 | Data requests/verified-subject bounded export, staff page/matrix, complete self-service security UX; honest deletion limits | Future only |
| P7 | OPERATIONS runbooks for separately authorized first owner, MFA/recovery, retention and incidents; full regression/browser/accessibility evidence | Future only; external launch work remains separate |

P2 must implement minimum functional security enrollment and impersonation exit even though P6 completes the full security page. Notes need additive SQL in their first implementing phase; do not imply P4 may use a nonexistent table. P1 must not temporarily retain full-email native listing as a privacy bypass; add the minimal projection wrapper then and complete audited reveal in P2. Multi-permission overview projection is tested per section.

Future runtime acceptance: valid fixtures for every role × endpoint expect successful authorized status or 403; unauthenticated calls expect 401, invalid payloads retain their actual errors. Separate route enumeration includes GET/POST/PATCH/DELETE, parameterized and mounted routes, compatibility paths, implicit HEAD behavior and unknown administrative routes. Test mixed/unknown roles, revoked sessions, direct native bypass, all sensitive reasons/freshness failures, simultaneous owner loss, MFA gate/escape, impersonated denial/stop, email masking/reveal audits and absence of audit mutation APIs. Public reports need payload/rate-limit tests; reports/requests need legal state-transition tests. Web tests cover permission-driven UI and exact ar/en key parity. Browser evidence must come from an actual browser, with keyboard/RTL and narrow-card layouts using existing tokens/native dialogs.

Required phase commands: bun run typecheck; bun run check; bun run build; bun run test; and cd apps/web && bun test tests. Only the root guarded API wrapper may run integration tests against local folio_test. It currently invokes db:migrate before tests, so P0 deliberately does not run it under the explicit no-migration instruction. Other commands and actual outcomes are recorded in STATUS/CHANGELOG. Passing legacy tests does not validate this unimplemented design. No browser, MFA, permission, hosted account or security acceptance is claimed in P0.

## 9. Decisions requiring human approval

- **A1, before P1:** replace legacy admin with owner without an alias (recommended), or explicitly permit a temporary alias. Any actual role conversion/bootstrap remains separately authorized and reviewed, without identifiers committed to docs.
- **A2, before P1:** approve in-process single-use wrapper capability/native-hook denial, mandatory per-action password verification plus five-minute session.freshAge, and the stale-session sign-in flow. Confirm the proposed 10–500 reason standard and extension to moderation/export. This is the principal security design gate.
- **A3, before P1:** approve enrollment-only native self-service exception, 15-minute impersonation maximum and authenticated stop wrapper outside /api/admin; never allow impersonated management access. Confirm whether staff trusted-device shortcuts should be disabled (recommended) in P2.
- **A4, before notes implementation:** approve the target-specific notes permission mapping or define explicit note permissions. Confirm read access to sensitive internal notes for analysts if retaining the proposed mapping.
- **A5, before P2:** approve separate append-only native outcome rows and the disclosed actor-FK limitation, or request a separately reviewed strict immutability migration. This changes audit interpretation, not historical records.
- **A6, before affected feature/launch:** confirm audit retention/archival policy, CSV limits, denial-audit limits and the legally reviewed data-request deadline. Proposed values are not approved retention/deletion or legal decisions. Identity-verification and R2/backups deletion completion rules also need operational approval before real requests.

No approval has been received for these proposals at this checkpoint. Stop after P0 and wait.

## 10. Verification references and limits

Local version-specific evidence: apps/api/node_modules/better-auth/package.json; dist/plugins/admin/access/statement.mjs; dist/plugins/admin/routes.mjs; dist/api/routes/session.mjs and password.mjs. These are dependency inspection references, not files changed by P0.

Primary references: [Better Auth Admin](https://better-auth.com/docs/plugins/admin), [session freshness](https://better-auth.com/docs/concepts/session-management), and [two-factor authentication](https://better-auth.com/docs/plugins/2fa). Online documentation may evolve; the installed package determines 1.7.7 implementation behavior. P0 does not infer the availability of a first-admin CLI from newer documentation. The first-owner runbook will describe only a separately authorized reviewed role-field change for an exact existing account.
