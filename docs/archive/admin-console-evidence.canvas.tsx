import { H1, H2, Table, Text, useHostTheme } from "cursor/canvas";

const rows: string[][] = [
	[
		"P0",
		"Observed state, discrepancies and unknown real role inventory",
		"Completed",
		"ADMIN_CONSOLE1–2; real role inventory never inferred or queried in this round.",
	],
	[
		"P0",
		"Architecture, shared matrix/native mapping, phase plan and human decisions",
		"Completed",
		"ADMIN_CONSOLE3–11 and amendments13–19; human amendments supersede original proposals.",
	],
	[
		"P0",
		"Reason/freshness/native wrapper design approval",
		"Superseded",
		"Amendment11/13: per-invocation password + TOTP, no freshAge change/capability/header/auth AsyncLocalStorage.",
	],
	[
		"P1",
		"Shared role policy/native defaultStatements; owner without admin alias",
		"Implemented locally",
		"contracts/admin-policy; lib/auth/access; admin-auth regression. No automatic conversion.",
	],
	[
		"P1",
		"Authoritative session/permission on every management endpoint",
		"Implemented locally",
		"middleware/admin and native hooks;33 mounted endpoint declarations; unknown/overlapping routes fail closed.",
	],
	[
		"P1",
		"UI permissions/navigation/forbidden; staff entry in Studio",
		"Implemented locally",
		"/me/permissions, AdminShell and shared membership; four-role browser matrix.",
	],
	[
		"P1",
		"Independent API/web; no-store/noindex admin and native HTTP closure",
		"Implemented locally",
		"Hono/native boundary tests; real browser HTML no-store; no new backend in Next.",
	],
	[
		"P1",
		"Origin/CORS/client-IP/auth/ownership/public-only regressions",
		"Implemented locally",
		"Guarded API tests; no bypass header or weakened native protocol.",
	],
	[
		"P2",
		"Native TOTP schema/enrollment/challenge/recovery materials",
		"Implemented locally",
		"Generated0004; session-bound factor fingerprint; enforced MFA child; real four-role enrollment/sign-in.",
	],
	[
		"P2",
		"Production-required TOTP, enrollment/recovery isolation and no trusted devices",
		"Implemented locally",
		"Native tests/fixtures/mfa; browser enrollment-only makes no management request.",
	],
	[
		"P2",
		"Sensitive reason10–500 and current operator password",
		"Implemented locally",
		"Shared sensitive-action/native before hooks; lock5/900 then900 independent of private-write120/60; no session age change.",
	],
	[
		"P2",
		"Ordinary ban/unban, optional API ban duration, one/all revoke",
		"Implemented locally",
		"Native wrappers/tests and existing account detail controls; protected targets deny.",
	],
	[
		"P2",
		"Full email masking and audited reveal",
		"Implemented locally",
		"Durable success before email response; privacy fix94fefd9 closes search inference for analyst/moderator.",
	],
	[
		"P2",
		"Typed ordinary-account removal and relational effects",
		"Implemented locally",
		"Native removeUser + exact account ID; cascades tested. R2 bytes/backups remain.",
	],
	[
		"P2",
		"Last-owner mutations/self-role changes/staff destructive actions",
		"Superseded",
		"Amendment13 keeps all protected-target and role mutations unavailable. No in-app last-owner concurrency guarantee; manual maintenance procedure required.",
	],
	[
		"P2",
		"Impersonation/start-stop/banner/timeout",
		"Superseded",
		"Human disabled impersonation for every role; no route or escape/banner built. Impersonated management identities still deny.",
	],
	[
		"P2",
		"Administrative password setting",
		"Superseded",
		"Human disabled for every role; no administrative password-setting feature.",
	],
	[
		"P2",
		"Private draft read wrapper",
		"Deferred",
		"Explicitly closed by simplified P2 scope; declared site.read_draft does not provide an endpoint. Public/preview ownership unchanged.",
	],
	[
		"P2",
		"Separate durable attempt/outcome and reconciliation",
		"Implemented locally",
		"Audit insert-only application writers, fail-closed attempts, transactional domain rollback; native outcome loss indeterminate; actor FK SET NULL caveat.",
	],
	[
		"P2",
		"Authenticated finite denial budgets",
		"Implemented locally",
		"Actor/action10 per60; authoritative denial remains after suppression; new requests reuse registry.",
	],
	[
		"P2",
		"General anonymous/global/unknown-native denial logging",
		"Deferred",
		"Finite global/trusted-address/retention design remains unresolved; no unbounded arbitrary-key audit writer.",
	],
	[
		"P3",
		"Generated reports table, constraints/indexes and production salt setting",
		"Implemented locally",
		"Generated0005/root guard only; production-required REPORT_IP_SALT; production application/configuration not performed.",
	],
	[
		"P3",
		"Anonymous published-only strict report endpoint/body/rate/dedup",
		"Implemented locally",
		"8192-byte body,10–1000 message,HMAC trusted address,5 IP/20 site per hour,300s concurrent dedup; no raw IP.",
	],
	[
		"P3",
		"Shared published portfolio Report action/form",
		"Implemented locally",
		"Main/project/article shared renderer slot; private previews no intake; prior P3 actual browser evidence.",
	],
	[
		"P3",
		"Oldest cursor queues, status/category filters and detail",
		"Implemented locally",
		"Timestamp(3)/UUID pagination, masked reporter email, no email filter/sort oracle; four-role page matrix.",
	],
	[
		"P3",
		"Transitions/closure notes/take-action suspension",
		"Implemented locally",
		"Open/reviewing legal transitions; required closure note; existing secured suspension dialog, separate real operations.",
	],
	[
		"P4",
		"Account columns/search/role/banned/verified filters/cursor",
		"Implemented locally",
		"user-service projection; name-only without read_email, role-authorized email matching, masked DTO; directory regression.",
	],
	[
		"P4",
		"Account identity/session/site/report detail and secured actions",
		"Implemented locally",
		"Native metadata-only sessions; ordinary-target action controls and related keyset lists; four-role page matrix.",
	],
	[
		"P4",
		"Optional ban duration input in focused account UI",
		"Partial / open",
		"Backend accepts bounded banExpiresIn; focused detail form exposes reason/password but no duration input.",
	],
	[
		"P4",
		"Account-specific recent audit panel",
		"Partial / open",
		"Global activity supports target filters; account detail currently has no embedded audit panel. Do not claim P4 completeness.",
	],
	[
		"P4",
		"User/site append-only internal notes and note APIs/schema",
		"Deferred",
		"Explicitly deferred by human; no admin_notes table/API/UI. Approved permission mapping remains a declaration only.",
	],
	[
		"P4",
		"Site published/suspended/reported filters and focused metadata",
		"Implemented locally",
		"site-service/routes/admin/sites and directory UI; no draft snapshot; locale/date from published release only.",
	],
	[
		"P4",
		"Site public link/report queue/moderation history/actions",
		"Implemented locally",
		"Related reports/audit, suspend/resume pipeline, public eligibility preserved; four-role browser pages.",
	],
	[
		"P4",
		"Administrative release history listing/published content inspection",
		"Partial / open",
		"Site detail has release count/current publication pointer/date/public link, no administrative full release-history endpoint/view or content inspector.",
	],
	[
		"P4",
		"Image count and byte-size summary",
		"Partial / open",
		"Ready/pending and total asset counts exist; image byte-size summary is absent from focused admin detail.",
	],
	[
		"P5",
		"Audit actor/action/target/status/date filters and grouped drawer",
		"Implemented locally",
		"audit-service finite metadata, requestId grouping, bounded history and100 correlated rows; prior browser drawer evidence.",
	],
	[
		"P5",
		"Audited identifier CSV/privacy/formula handling",
		"Implemented locally",
		"POST /audit/export with password/reason/TOTP;1000 default rows/configurable10000; fixed identifiers/action/status/time; no reasons/email/metadata.",
	],
	[
		"P5",
		"Original GET audit/export.csv and proposed byte cap",
		"Partial / open",
		"Credentialed POST replaces planned GET. Explicit CSV byte cap is not implemented; only row bounds. The P6 JSON byte cap is separate.",
	],
	[
		"P5",
		"System configuration booleans/build version/migration count",
		"Implemented locally",
		"system-service actual booleans/counters; BUILD_VERSION unknown unless configured; flags never claim provider health.",
	],
	[
		"P5",
		"Upload failure event counter",
		"Partial / open",
		"failedUploadEvents=null because schema stores no failure event; no fabricated counter. New telemetry remains outside this scope.",
	],
	[
		"P5",
		"Expired pending/stale deleting upload counters",
		"Implemented locally",
		"Database state predicates, deleting older15min; distinct from provider failure events.",
	],
	[
		"P5",
		"Recent inquiry-volume metric",
		"Partial / open",
		"Global resource inquiry total exists; requested recent-window volume is not implemented.",
	],
	[
		"P5",
		"Generated bilingual notices CRUD/window/preview/public banners",
		"Implemented locally",
		"Generated0006; create/edit/disable, strict windows, public minimized active rows;60s polling and known expiry removal; no portfolio banners.",
	],
	[
		"P5",
		"Notice DELETE endpoint",
		"Superseded",
		"Actual approved P5 console uses disable; no hard-delete endpoint or invented retention purge.",
	],
	[
		"P5",
		"Overview real totals/open reports/notices/recent10 audit/system attention",
		"Implemented locally",
		"Permission-scoped readOverview; actual data only. P6 adds open/overdue request counts.",
	],
	[
		"P5",
		"Overview new accounts7d, oldest report cards and near-due request cards",
		"Partial / open",
		"No new-account7d or oldest-report list; request counts are overdue/open, not near-deadline cards. Current totals must not imply those metrics.",
	],
	[
		"P5",
		"Overview SMTP-unconfigured alert treatment",
		"Partial / open",
		"System section exposes SMTP boolean to system.read; no distinct overview notification alert component.",
	],
	[
		"P6",
		"Generated data_requests required fields and verification evidence",
		"Implemented locally",
		"Generated0007 only; due/status indexes/checks, optional subject and actor SET NULL; no user/sites schema change.",
	],
	[
		"P6",
		"Named configurable due period with legal decision pending",
		"Implemented locally",
		"DATA_REQUEST_DUE_DAYS30 default1–365; engineering operational placeholder, legal confirmation OPEN.",
	],
	[
		"P6",
		"Request list/due/status/type/overdue/cursor/manual creation/detail",
		"Implemented locally",
		"request.read/handle owner/support, masked contact, no email matching; real browser manual creation and four-role pages.",
	],
	[
		"P6",
		"Legal transitions and closure evidence",
		"Implemented locally",
		"received→in_progress/rejected;in_progress→completed/rejected; terminal conflicts;10–500 notes; full transition matrix tests.",
	],
	[
		"P6",
		"Resolve/verify subject before export",
		"Implemented locally",
		"One-time ordinary exact-ID/retyped confirmation/independent evidence with persistent verifier/time. Manual operator attestation; no automated external identity proof.",
	],
	[
		"P6",
		"Owner-only bounded JSON account/site/inquiry export",
		"Implemented locally",
		"request.export strict stored subject/ownership;1000 combined rows/1MiB defaults; explicit columns/exclusions; secrets/foreign account/byte/row/audit failure tests.",
	],
	[
		"P6",
		"Complete data-access/erasure/R2/backups handling",
		"Partial / open",
		"Export is documented subset; no drafts/snapshots/assets/R2/backups retrieval. Delete/correction manual; status completion cannot establish legal completeness or delivery.",
	],
	[
		"P6",
		"Link to audited account removal from request detail",
		"Partial / open",
		"Verified account ID displayed; direct removal action/link not embedded in request detail. Existing /accounts/:id audited removal remains available separately.",
	],
	[
		"P6",
		"Read-only staff roles/MFA/last-audit/matrix",
		"Implemented locally",
		"staff.read owner only,1000 bound/truncation, shared permissions, no email/factors; four-role page checks.",
	],
	[
		"P6",
		"Staff role modification controls",
		"Superseded",
		"Human round4 explicitly requests read-only page; reviewed manual procedure only, not executed.",
	],
	[
		"P6",
		"Self native TOTP/recovery/setup/security redirect",
		"Implemented locally",
		"/security and /mfa-required preserve native flow/enrollment-only isolation; four-role browser enrollment and sign-in.",
	],
	[
		"P6",
		"Own active sessions and revoke other own sessions",
		"Implemented locally",
		"Native list-sessions/revoke-session; tokens not rendered/logged; current control hidden; cross-account native ownership test and real browser revoke.",
	],
	[
		"P6",
		"Specific Arabic/English/RTL and exact key parity",
		"Implemented locally",
		"requests/security copy parity; web tests; four-role locales320/1280 browser matrix and actual Tab/Escape tests.",
	],
	[
		"P7",
		"First-admin/manual-role procedure documented only",
		"Completed",
		"OPERATIONS seven-step guarded exact account/role review, maintenance/drain/session revocation; no real account change executed.",
	],
	[
		"P7",
		"MFA/recovery/key rotation runbooks",
		"Completed",
		"OPERATIONS retained legacy/versioned key procedure; native synthetic tests only; no real key rotation/recovery drill.",
	],
	[
		"P7",
		"Short incident response/reconciliation plan",
		"Completed",
		"OPERATIONS round4 triage/scope/authorized containment/audit reconciliation/isolated recovery/human review; not an executed incident.",
	],
	[
		"P7",
		"Proposed retention/archive policy",
		"Open human decision",
		"180d searchable audit/90d closed requests-reports/30d expired notices are proposals only. No automatic deletion or legal approval; backups/logs/holds remain open.",
	],
	[
		"P7",
		"Full local API/MFA/type/style/web/default build gates",
		"Verified locally",
		"Final guarded root57 pass/11 child-only skips/2961 assertions; native MFA child11 pass308; web27 pass596; type/style351 files/default QA build25/25 plus dynamic routes exit0. Logs work/round4/p7-*.",
	],
	[
		"P7",
		"Actual browser all console pages/four staff roles",
		"Verified locally",
		"Final local Chromium240 route cases:15 routes ×4 roles ×2 locales ×2 widths320/1280,0 page errors. Real owner create/progress/verify/export and other-own-session revoke. Other roles page/denial checks, not every mutation. Native enrollment for owner/moderator was observed in earlier same-fixture attempts; all four did fresh native password/TOTP sign-in in final matrix.",
	],
	[
		"P7",
		"Keyboard/RTL/narrow cards/no-store and secret masking",
		"Verified locally",
		"All240 route cases no-store/no horizontal overflow; allowed pages no error alerts and denied pages no management data fetch. Owner verification dialog Tab/Escape/password clearing exercised. Request/security screenshots inspected; session and forbidden-header wrap bugs fixed. No accessibility certification or physical-device claim.",
	],
	[
		"P7",
		"Physical devices/hosted cookies/provider delivery/remote CI/restore",
		"External gate",
		"Not performed by round4; local Chromium and build cannot prove these integrations or launch readiness.",
	],
	[
		"P7",
		"Production migrations/configuration/deployment; authorized upload",
		"External / upload completed",
		"Production/deployment remain unauthorized and unperformed; hosted ledger/provider health uninspected. Later human-authorized ordinary GitHub push exited0, advancing e14ff76 to3fd12a8; documentation checkpoint included in final sync. Remote CI unverified.",
	],
	[
		"P7",
		"Cleanup/local services stopped/review stop",
		"Verified locally",
		"5 newly disposable identities removed; root guarded proof confirms their users/sessions/audit rows and2 recorded requests absent.16 actual request audit rows captured before cleanup; no notices created. Temporary TOTP/credential/download files removed; ports4300/4400/55432 verified closed. Stop after authorized upload.",
	],
];
/** Item-level acceptance mapping; historical proposals never silently become implemented features. */
export default function AdminConsoleEvidence() {
	const theme = useHostTheme();
	return (
		<main
			style={{
				color: theme.text.primary,
				background: theme.bg.editor,
				padding: 24,
				maxWidth: 1600,
				margin: "0 auto",
			}}
		>
			<H1>مراجعة لوحة الإدارة: P0–P7</H1>
			<Text>2026-10-19 · Local evidence only · Authorized upload completed · No deployment</Text>
			<H2>حالة كل بند في الخطة الأصلية</H2>
			<Text>
				Source: docs/ADMIN_CONSOLE.md sections20–22, original P0/API/page/test plan and overriding
				human amendments. Local implementation is distinct from deployment, legal approval and
				deferred scope. All final verified rows have recorded evidence; external and deferred rows
				remain open.
			</Text>
			<Table
				headers={["المرحلة", "البند الأصلي", "الحالة الفعلية", "الدليل أو سبب عدم الاكتمال"]}
				rows={rows}
				columnAlign={["left", "left", "left", "left"]}
				stickyHeader
				striped
				style={{ maxHeight: "78vh" }}
			/>
		</main>
	);
}
