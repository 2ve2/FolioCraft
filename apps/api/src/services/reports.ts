import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";
import type { ContentReport, reportInput } from "@ichnara/contracts";
import { and, asc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { env } from "../config/env";
import { db } from "../db";
import { user } from "../db/schema/auth";
import { contentReports as reports } from "../db/schema/reports";
import { releases, sites } from "../db/schema/site";
import { ApiError } from "../lib/response-helpers";
import { type AuditContext, recordAdminAction } from "./admin/audit-service";
import { rateLimitService } from "./rate-limit";
import { publicAccessPredicate } from "./sites/public-access";

export const reportLimits = {
	ip: 5,
	site: 20,
	windowSeconds: 3600,
	duplicateSeconds: 300,
	bodyBytes: 8192,
} as const;
const cursorSchema = z.object({ createdAt: z.iso.datetime(), id: z.uuid() }).strict();

/** Hashes only the runtime-derived address with a domain-separated server-only salt. */
export function reportIpHash(address: string) {
	if (!env.REPORT_IP_SALT) throw new ApiError(503, "REPORTING_UNAVAILABLE");
	if (!isIP(address)) throw new ApiError(400, "CLIENT_IP_REQUIRED");
	// Normalize IPv6 textual variants before hashing so alternate spelling cannot split a bucket.
	const normalized = isIP(address) === 6 ? new URL(`http://[${address}]/`).hostname : address;
	return createHmac("sha256", env.REPORT_IP_SALT)
		.update(`ichnara:report-ip:v1\0${normalized}`)
		.digest("hex");
}

/** Excludes stored IP hashes and always masks reporter contact details, for every staff role. */
function reportView(row: typeof reports.$inferSelect, slug: string): ContentReport {
	const email = row.reporterEmail,
		at = email?.lastIndexOf("@") ?? -1;
	return {
		id: row.id,
		siteId: row.siteId,
		slug,
		category: row.category,
		message: row.message,
		reporterEmail: email && at > 0 ? `${email[0]}***${email.slice(at)}` : null,
		status: row.status,
		handledBy: row.handledBy,
		handledAt: row.handledAt?.toISOString() ?? null,
		resolutionNote: row.resolutionNote,
		createdAt: row.createdAt.toISOString(),
	};
}

export const reportService = {
	/** Accepts only an already-public site and returns the same receipt for suppressed duplicates. */
	async create(slug: string, input: z.infer<typeof reportInput>, address: string) {
		const ipHash = reportIpHash(address);
		const [site] = await db
			.select({ id: sites.id })
			.from(sites)
			.innerJoin(
				releases,
				and(eq(sites.publishedReleaseId, releases.id), eq(sites.id, releases.siteId)),
			)
			.innerJoin(user, eq(user.id, sites.ownerId))
			.where(and(eq(sites.slug, slug), publicAccessPredicate()))
			.limit(1);
		if (!site) throw new ApiError(404, "NOT_FOUND");
		for (const [key, max] of [
			[`report:ip:${ipHash}`, reportLimits.ip],
			[`report:site:${site.id}`, reportLimits.site],
		] as const) {
			const limit = await rateLimitService.consume(key, max, reportLimits.windowSeconds);
			if (!limit.allowed) throw new ApiError(429, "RATE_LIMITED");
		}
		const fingerprint = createHash("sha256")
			.update(
				JSON.stringify([
					site.id,
					ipHash,
					input.category,
					input.message,
					input.reporterEmail ?? null,
				]),
			)
			.digest("hex");
		await db.transaction(async (tx) => {
			// Serialize equal receipts without storing a raw address or an additional dedup identity column.
			await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${fingerprint},0))`);
			const [existing] = await tx
				.select({ id: reports.id })
				.from(reports)
				.where(
					and(
						eq(reports.siteId, site.id),
						eq(reports.reporterIpHash, ipHash),
						eq(reports.category, input.category),
						eq(reports.message, input.message),
						input.reporterEmail
							? eq(reports.reporterEmail, input.reporterEmail)
							: isNull(reports.reporterEmail),
						gt(
							reports.createdAt,
							sql`clock_timestamp()-make_interval(secs=>${reportLimits.duplicateSeconds})`,
						),
					),
				)
				.limit(1);
			if (!existing)
				await tx.insert(reports).values({
					siteId: site.id,
					category: input.category,
					message: input.message,
					reporterEmail: input.reporterEmail,
					reporterIpHash: ipHash,
				});
		});
		return { accepted: true };
	},
	/** Uses a stable ascending timestamp/ID cursor; filters never silently reuse offset pagination. */
	async list(query: {
		limit: number;
		siteId?: string;
		ownerId?: string;
		cursor?: string;
		status?: (typeof reports.$inferSelect)["status"];
		category?: (typeof reports.$inferSelect)["category"];
	}) {
		let after: z.infer<typeof cursorSchema> | undefined;
		if (query.cursor) {
			try {
				after = cursorSchema.parse(JSON.parse(Buffer.from(query.cursor, "base64url").toString()));
			} catch {
				throw new ApiError(400, "INVALID_CURSOR");
			}
		}
		const rows = await db
			.select({ report: reports, slug: sites.slug })
			.from(reports)
			.innerJoin(sites, eq(reports.siteId, sites.id))
			.where(
				and(
					query.siteId ? eq(reports.siteId, query.siteId) : undefined,
					query.ownerId ? eq(sites.ownerId, query.ownerId) : undefined,
					query.status ? eq(reports.status, query.status) : undefined,
					query.category ? eq(reports.category, query.category) : undefined,
					after
						? or(
								gt(reports.createdAt, new Date(after.createdAt)),
								and(eq(reports.createdAt, new Date(after.createdAt)), gt(reports.id, after.id)),
							)
						: undefined,
				),
			)
			.orderBy(asc(reports.createdAt), asc(reports.id))
			.limit(query.limit + 1);
		const items = rows.slice(0, query.limit).map((row) => reportView(row.report, row.slug)),
			last = items.at(-1);
		return {
			items,
			nextCursor:
				rows.length > query.limit && last
					? Buffer.from(JSON.stringify({ createdAt: last.createdAt, id: last.id })).toString(
							"base64url",
						)
					: null,
		};
	},
	/** Returns a minimized report with a public slug, never a private draft or raw reporter contact. */
	async get(id: string) {
		const [row] = await db
			.select({ report: reports, slug: sites.slug })
			.from(reports)
			.innerJoin(sites, eq(reports.siteId, sites.id))
			.where(eq(reports.id, id))
			.limit(1);
		if (!row) throw new ApiError(404, "NOT_FOUND");
		return reportView(row.report, row.slug);
	},
	/** Keeps a durable attempt and commits the legal transition with its success outcome atomically. */
	async status(
		id: string,
		input: { status: "reviewing" | "dismissed" | "actioned"; resolutionNote?: string },
		context: AuditContext,
	) {
		await this.get(id);
		const correlation = {
			...context,
			requestId: crypto.randomUUID(),
			reason: input.resolutionNote,
		};
		try {
			await recordAdminAction(
				db,
				{ ...correlation, status: "attempted" },
				"report.handle",
				"report",
				id,
			);
		} catch {
			throw new ApiError(503, "ADMIN_AUDIT_UNAVAILABLE");
		}
		try {
			await db.transaction(async (tx) => {
				const [row] = await tx.select().from(reports).where(eq(reports.id, id)).for("update");
				if (!row) throw new ApiError(404, "NOT_FOUND");
				if (!["open", "reviewing"].includes(row.status) || row.status === input.status)
					throw new ApiError(409, "REPORT_STATUS_CONFLICT");
				await tx
					.update(reports)
					.set({
						status: input.status,
						handledBy: context.actorId,
						handledAt: new Date(),
						resolutionNote: input.resolutionNote ?? null,
					})
					.where(eq(reports.id, id));
				await recordAdminAction(
					tx,
					{ ...correlation, status: "succeeded" },
					"report.handle",
					"report",
					id,
					{ from: row.status, to: input.status },
				);
			});
		} catch (error) {
			try {
				await recordAdminAction(
					db,
					{ ...correlation, status: "failed" },
					"report.handle",
					"report",
					id,
				);
			} catch {
				throw new ApiError(503, "ADMIN_ACTION_INDETERMINATE");
			}
			throw error;
		}
		return this.get(id);
	},
};
