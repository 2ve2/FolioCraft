import { hasPermission } from "@ichnara/contracts/admin-policy";
import { sql } from "drizzle-orm";
import { env, mailConfigured, storageConfigured } from "../../config/env";
import { db } from "../../db";
import { adminAudit } from "../../db/schema/admin";
import { assets } from "../../db/schema/asset";
import { user } from "../../db/schema/auth";
import { systemNotices } from "../../db/schema/notices";
import { contentReports } from "../../db/schema/reports";
import { sites } from "../../db/schema/site";
import { listAdminAudit } from "./audit-service";
/** Counters represent stored states only; no upload-failure event column exists. */
export async function readSystem() {
	const result = await db.execute<{
		expiredPendingUploads: number;
		stuckDeletingUploads: number;
		openReports: number;
		migrationCount: number;
	}>(sql`select
 (select count(*)::int from ${assets} where ${assets.status}='pending' and ${assets.expiresAt} <= current_timestamp) as "expiredPendingUploads",
 (select count(*)::int from ${assets} where ${assets.status}='deleting' and ${assets.updatedAt} < current_timestamp-interval '15 minutes') as "stuckDeletingUploads",
 (select count(*)::int from ${contentReports} where ${contentReports.status} in ('open','reviewing')) as "openReports",
 (select count(*)::int from drizzle.__drizzle_migrations) as "migrationCount"`);
	return {
		configuration: {
			smtp: mailConfigured,
			storage: storageConfigured,
			reportIpSalt: Boolean(env.REPORT_IP_SALT),
			mfaEnforced: env.ADMIN_REQUIRE_MFA,
		},
		...result.rows[0],
		failedUploadEvents: null,
		buildVersion: env.BUILD_VERSION,
		auditExportMaxRows: env.ADMIN_AUDIT_EXPORT_MAX_ROWS,
	};
}
/** Each section is queried only when the authoritative role grants that resource. */
export async function readOverview(role: string | null | undefined) {
	const output: Record<string, unknown> = {};
	if (hasPermission(role, "user", "read")) {
		const result = await db.execute(
			sql`select count(*)::int as total,count(*) filter(where ${user.banned})::int as banned from ${user}`,
		);
		output.accounts = result.rows[0];
	}
	if (hasPermission(role, "site", "read")) {
		const result = await db.execute(
			sql`select count(*)::int as total,count(*) filter(where ${sites.publishedReleaseId} is not null)::int as published,count(*) filter(where ${sites.suspended})::int as suspended from ${sites}`,
		);
		output.sites = result.rows[0];
	}
	if (hasPermission(role, "report", "read")) {
		const result = await db.execute(
			sql`select count(*) filter(where ${contentReports.status}='open')::int as open,count(*) filter(where ${contentReports.status}='reviewing')::int as reviewing from ${contentReports}`,
		);
		output.reports = result.rows[0];
	}
	if (hasPermission(role, "notice", "read")) {
		const result = await db.execute(
			sql`select count(*) filter(where ${systemNotices.active} and ${systemNotices.startsAt}<=current_timestamp and ${systemNotices.endsAt}>current_timestamp)::int as current from ${systemNotices}`,
		);
		output.notices = result.rows[0];
	}
	if (hasPermission(role, "audit", "read")) {
		output.recentEvents = (await listAdminAudit(10, 0)).items;
		const result = await db.execute(
			sql`select count(*)::int as unresolved from ${adminAudit} a where a.status='attempted' and a.created_at < current_timestamp-interval '15 minutes' and not exists(select 1 from ${adminAudit} o where o.request_id=a.request_id and o.status in ('succeeded','failed'))`,
		);
		output.auditAttention = result.rows[0];
	}
	if (hasPermission(role, "system", "read")) output.system = await readSystem();
	output.laterResources = { requests: null, notes: null, staffManagement: null };
	return output;
}
